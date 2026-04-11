import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card, GameConfig, Member, SimulationParams, Specialty } from '../simulation/types';
import { JOB_ROLES } from '../simulation/rolesCatalog';
import { TRAITS } from '../simulation/traitsCatalog';
import { diceMaxForMember, ensureSynergyKeys } from '../simulation/engine';
import { SynergyMatrix } from './SynergyMatrix';
import { MemberSynergyPanel } from './MemberSynergyPanel';
import { directedKey, pairKey } from '../simulation/synergy';

type Props = {
  value: GameConfig;
  onChange: (next: GameConfig) => void;
  onStart: () => void;
};

function compactOptRecord<T extends Record<string, unknown>>(r: T | undefined): T | undefined {
  if (!r) return undefined;
  return Object.keys(r).length === 0 ? undefined : r;
}

function stripDirectedForMember(d: Record<string, number> | undefined, removedId: string): Record<string, number> | undefined {
  if (!d) return undefined;
  const next = { ...d };
  for (const k of Object.keys(next)) {
    const parts = k.split('>>');
    if (parts.length !== 2) continue;
    if (parts[0] === removedId || parts[1] === removedId) delete next[k];
  }
  return compactOptRecord(next);
}

function stripPairBidirectionalForMember(
  pb: Record<string, boolean> | undefined,
  removedId: string,
): Record<string, boolean> | undefined {
  if (!pb) return undefined;
  const next = { ...pb };
  for (const k of Object.keys(next)) {
    if (k.includes(removedId)) delete next[k];
  }
  return compactOptRecord(next);
}

const SPECIALTIES: Specialty[] = ['Analista', 'Desenvolvedor', 'Testador'];

export function SetupScreen({ value, onChange, onStart }: Props) {
  const { t } = useTranslation();
  const synergy = useMemo(
    () => ensureSynergyKeys(value.members, value.synergyByPair),
    [value.members, value.synergyByPair],
  );

  const memberIds = value.members.map((m) => m.id);
  const errors: string[] = [];
  if (value.members.length === 0) errors.push(t('errors.atLeastOneMember'));
  for (const c of value.backlogCards) {
    if (c.collaborative && c.assigneeIds.length < 2) {
      errors.push(t('errors.collabTwoAssignees', { title: c.title }));
    }
    if (!c.collaborative && c.assigneeIds.length < 1) {
      errors.push(t('errors.cardOneAssignee', { title: c.title }));
    }
  }

  function patchParams(p: Partial<SimulationParams>) {
    onChange({ ...value, params: { ...value.params, ...p } });
  }

  function patchMember(i: number, m: Partial<Member>) {
    const members = value.members.map((x, j) => (j === i ? { ...x, ...m } : x));
    onChange({ ...value, members, synergyByPair: ensureSynergyKeys(members, value.synergyByPair) });
  }

  function removeMember(i: number) {
    const removed = value.members[i];
    const members = value.members.filter((_, j) => j !== i);
    const nextSyn = { ...value.synergyByPair };
    for (const k of Object.keys(nextSyn)) {
      if (k.includes(removed.id)) delete nextSyn[k];
    }
    const backlogCards = value.backlogCards.map((c) => ({
      ...c,
      assigneeIds: c.assigneeIds.filter((id) => id !== removed.id),
    }));
    onChange({
      ...value,
      members,
      synergyByPair: ensureSynergyKeys(members, nextSyn),
      synergyDirected: stripDirectedForMember(value.synergyDirected, removed.id),
      synergyPairBidirectional: stripPairBidirectionalForMember(value.synergyPairBidirectional, removed.id),
      backlogCards,
    });
  }

  function setPairSynergy(idA: string, idB: string, v: number) {
    const k = pairKey(idA, idB);
    onChange({ ...value, synergyByPair: { ...value.synergyByPair, [k]: v } });
  }

  function setDirectedSynergy(fromId: string, toId: string, v: number) {
    const next = { ...(value.synergyDirected ?? {}), [directedKey(fromId, toId)]: v };
    onChange({ ...value, synergyDirected: compactOptRecord(next) });
  }

  function setPairBidirectional(idA: string, idB: string, bidirectional: boolean) {
    const pk = pairKey(idA, idB);
    const nextBi = { ...(value.synergyPairBidirectional ?? {}) };
    const nextDir = { ...(value.synergyDirected ?? {}) };
    const pairVal = value.synergyByPair[pk] ?? 0;

    if (bidirectional) {
      delete nextBi[pk];
      const dAB = nextDir[directedKey(idA, idB)];
      const dBA = nextDir[directedKey(idB, idA)];
      let merged = pairVal;
      if (dAB !== undefined && dBA !== undefined) merged = (dAB + dBA) / 2;
      else if (dAB !== undefined) merged = dAB;
      else if (dBA !== undefined) merged = dBA;
      delete nextDir[directedKey(idA, idB)];
      delete nextDir[directedKey(idB, idA)];
      onChange({
        ...value,
        synergyPairBidirectional: compactOptRecord(nextBi),
        synergyDirected: compactOptRecord(nextDir),
        synergyByPair: { ...value.synergyByPair, [pk]: merged },
      });
      return;
    }

    nextBi[pk] = false;
    if (nextDir[directedKey(idA, idB)] === undefined && nextDir[directedKey(idB, idA)] === undefined) {
      nextDir[directedKey(idA, idB)] = pairVal;
      nextDir[directedKey(idB, idA)] = pairVal;
    }
    onChange({
      ...value,
      synergyPairBidirectional: compactOptRecord(nextBi),
      synergyDirected: compactOptRecord(nextDir),
    });
  }

  function patchMemberRoleSynergy(memberId: string, sp: Specialty, val: number | null) {
    const members = value.members.map((m) => {
      if (m.id !== memberId) return m;
      const prev = { ...(m.synergyByCounterpartySpecialty ?? {}) };
      if (val === null || val === 0) delete prev[sp];
      else prev[sp] = val;
      const keys = Object.keys(prev);
      return {
        ...m,
        synergyByCounterpartySpecialty: keys.length > 0 ? (prev as Member['synergyByCounterpartySpecialty']) : undefined,
      };
    });
    onChange({ ...value, members });
  }

  function addMember() {
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const m: Member = {
      id,
      name: t('setup.defaults.newMemberName'),
      specialty: 'Desenvolvedor',
    };
    onChange({
      ...value,
      members: [...value.members, m],
      synergyByPair: ensureSynergyKeys([...value.members, m], value.synergyByPair),
    });
  }

  function patchCard(i: number, c: Partial<Card>) {
    const backlogCards = value.backlogCards.map((x, j) => (j === i ? { ...x, ...c } : x));
    onChange({ ...value, backlogCards });
  }

  function removeCard(i: number) {
    onChange({ ...value, backlogCards: value.backlogCards.filter((_, j) => j !== i) });
  }

  function addCard() {
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const card: Card = {
      id,
      title: t('setup.defaults.newStoryTitle'),
      points: 5,
      collaborative: false,
      assigneeIds: memberIds[0] ? [memberIds[0]] : [],
    };
    onChange({ ...value, backlogCards: [...value.backlogCards, card] });
  }

  const canStart = errors.length === 0;

  return (
    <div className="setup-screen">
      <header className="page-header">
        <h1>{t('setup.title')}</h1>
        <p className="lede">{t('setup.lede')}</p>
      </header>

      <section className="panel">
        <h2>{t('setup.team')}</h2>
        <button type="button" className="btn secondary" onClick={addMember}>
          {t('setup.addMember')}
        </button>
        <div className="member-grid">
          {value.members.map((m, i) => (
            <div key={m.id} className="member-card">
              <input
                className="input"
                value={m.name}
                onChange={(e) => patchMember(i, { name: e.target.value })}
                placeholder={t('setup.memberNamePlaceholder')}
              />
              <select
                className="input"
                value={m.specialty}
                onChange={(e) => patchMember(i, { specialty: e.target.value as Specialty })}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {t(`specialty.${s}`)}
                  </option>
                ))}
              </select>
              <label>{t('setup.jobRole')}</label>
              <select
                className="input"
                value={m.jobRoleId ?? ''}
                onChange={(e) => patchMember(i, { jobRoleId: e.target.value || undefined })}
              >
                <option value="">{t('setup.traitNone')}</option>
                {JOB_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(`jobRoles.${r.id}.name`)}
                  </option>
                ))}
              </select>
              {m.jobRoleId ? (
                <p className="trait-hint">{t(`jobRoles.${m.jobRoleId}.gameEffect`)}</p>
              ) : null}
              <label>{t('setup.deliveryRange')}</label>
              <div className="member-delivery-row">
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="input narrow"
                  value={m.deliveryMin ?? 1}
                  onChange={(e) => {
                    const legacyHi = diceMaxForMember(m);
                    const v = Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1)));
                    const hi = m.deliveryMax ?? legacyHi;
                    patchMember(i, { deliveryMin: v, deliveryMax: Math.max(v, hi) });
                  }}
                />
                <span className="delivery-sep">—</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="input narrow"
                  value={m.deliveryMax ?? diceMaxForMember(m)}
                  onChange={(e) => {
                    const fallback = diceMaxForMember(m);
                    const v = Math.max(1, Math.min(30, Math.round(Number(e.target.value) || fallback)));
                    const lo = m.deliveryMin ?? 1;
                    patchMember(i, { deliveryMin: Math.min(lo, v), deliveryMax: v });
                  }}
                />
              </div>
              <p className="trait-hint">{t('setup.deliveryHint')}</p>
              <label>{t('setup.quality')}</label>
              <select
                className="input"
                value={m.traitQualityId ?? ''}
                onChange={(e) =>
                  patchMember(i, { traitQualityId: e.target.value || undefined })
                }
              >
                <option value="">{t('setup.traitNone')}</option>
                {TRAITS.filter((tr) => tr.kind === 'quality').map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {t(`traits.${tr.id}.name`)}
                  </option>
                ))}
              </select>
              <label>{t('setup.flaw')}</label>
              <select
                className="input"
                value={m.traitFlawId ?? ''}
                onChange={(e) => patchMember(i, { traitFlawId: e.target.value || undefined })}
              >
                <option value="">{t('setup.traitNone')}</option>
                {TRAITS.filter((tr) => tr.kind === 'flaw').map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {t(`traits.${tr.id}.name`)}
                  </option>
                ))}
              </select>
              <p className="trait-hint">
                {m.traitQualityId && t(`traits.${m.traitQualityId}.gameEffect`)}
                {m.traitFlawId && (
                  <>
                    <br />
                    {t(`traits.${m.traitFlawId}.gameEffect`)}
                  </>
                )}
              </p>
              <MemberSynergyPanel
                self={m}
                members={value.members}
                synergyByPair={synergy}
                synergyPairBidirectional={value.synergyPairBidirectional}
                synergyDirected={value.synergyDirected}
                onPairChange={setPairSynergy}
                onDirectedChange={setDirectedSynergy}
                onPairBidirectionalChange={setPairBidirectional}
                onRoleDeltaChange={patchMemberRoleSynergy}
              />
              <button type="button" className="btn danger small" onClick={() => removeMember(i)}>
                {t('setup.remove')}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>{t('setup.synergyTitle')}</h2>
        <SynergyMatrix
          members={value.members}
          synergyByPair={synergy}
          synergyPairBidirectional={value.synergyPairBidirectional}
          onChange={(next) => onChange({ ...value, synergyByPair: next })}
        />
      </section>

      <section className="panel">
        <h2>{t('setup.backlogTitle')}</h2>
        <button type="button" className="btn secondary" onClick={addCard}>
          {t('setup.addCard')}
        </button>
        <table className="data-table backlog-table">
          <thead>
            <tr>
              <th>{t('setup.tableTitle')}</th>
              <th>{t('setup.tablePoints')}</th>
              <th>{t('setup.tableCollab')}</th>
              <th>{t('setup.tableAssignees')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {value.backlogCards.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <input
                    className="input"
                    value={c.title}
                    onChange={(e) => patchCard(i, { title: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="input narrow"
                    value={c.points}
                    onChange={(e) => patchCard(i, { points: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={c.collaborative}
                    onChange={(e) => patchCard(i, { collaborative: e.target.checked })}
                  />
                </td>
                <td>
                  {c.collaborative ? (
                    <div className="assignee-row">
                      <select
                        className="input"
                        value={c.assigneeIds[0] ?? ''}
                        onChange={(e) => {
                          const a = e.target.value;
                          const b = c.assigneeIds[1] ?? memberIds[1] ?? a;
                          patchCard(i, { assigneeIds: [a, b] });
                        }}
                      >
                        {value.members.map((mem) => (
                          <option key={mem.id} value={mem.id}>
                            {mem.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="input"
                        value={c.assigneeIds[1] ?? ''}
                        onChange={(e) => {
                          const b = e.target.value;
                          const a = c.assigneeIds[0] ?? memberIds[0];
                          patchCard(i, { assigneeIds: [a, b] });
                        }}
                      >
                        {value.members.map((mem) => (
                          <option key={mem.id} value={mem.id}>
                            {mem.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <select
                      className="input"
                      value={c.assigneeIds[0] ?? ''}
                      onChange={(e) => patchCard(i, { assigneeIds: [e.target.value] })}
                    >
                      {value.members.map((mem) => (
                        <option key={mem.id} value={mem.id}>
                          {mem.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <button type="button" className="btn danger small" onClick={() => removeCard(i)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>{t('setup.paramsTitle')}</h2>
        <div className="params-grid">
          <label>
            {t('setup.params.daysPerSprint')}
            <input
              type="number"
              min={3}
              max={30}
              className="input"
              value={value.params.daysPerSprint}
              onChange={(e) => patchParams({ daysPerSprint: Math.max(3, Number(e.target.value) || 10) })}
            />
          </label>
          <label>
            {t('setup.params.numSprints')}
            <input
              type="number"
              min={1}
              max={50}
              className="input"
              value={value.params.numSprints}
              onChange={(e) => patchParams({ numSprints: Math.max(1, Number(e.target.value) || 3) })}
            />
          </label>
          <label>
            {t('setup.params.seed')}
            <input
              type="number"
              className="input"
              value={value.params.seed}
              onChange={(e) => patchParams({ seed: Number(e.target.value) || 0 })}
            />
          </label>
          <label>
            {t('setup.params.wipPerColumn')}
            <input
              type="number"
              min={1}
              max={10}
              className="input"
              value={value.params.wipPerColumn}
              onChange={(e) => patchParams({ wipPerColumn: Math.max(1, Number(e.target.value) || 3) })}
            />
          </label>
          <label>
            {t('setup.params.planningPullMax')}
            <input
              type="number"
              min={1}
              max={20}
              className="input"
              value={value.params.planningPullMax}
              onChange={(e) => patchParams({ planningPullMax: Math.max(1, Number(e.target.value) || 5) })}
            />
          </label>
          <label>
            {t('setup.params.synergyBeta')}
            <input
              type="number"
              step={0.05}
              className="input"
              value={value.params.synergyBeta}
              onChange={(e) => patchParams({ synergyBeta: Number(e.target.value) || 0 })}
            />
          </label>
          <label>
            {t('setup.params.synergyGamma')}
            <input
              type="number"
              step={0.05}
              className="input"
              value={value.params.synergyGamma}
              onChange={(e) => patchParams({ synergyGamma: Number(e.target.value) || 0 })}
            />
          </label>
          <label>
            {t('setup.params.dailyRandomEventChance')}
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="input"
              value={value.params.dailyRandomEventChance ?? 0}
              onChange={(e) =>
                patchParams({
                  dailyRandomEventChance: Math.min(
                    1,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="panel hypothesis">
        <h2>{t('setup.hypothesisTitle')}</h2>
        <p>{t('setup.hypothesisBody')}</p>
      </section>

      {errors.length > 0 && (
        <div className="alert error">
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="setup-actions">
        <button type="button" className="btn primary" disabled={!canStart} onClick={onStart}>
          {t('setup.startGame')}
        </button>
      </div>
    </div>
  );
}
