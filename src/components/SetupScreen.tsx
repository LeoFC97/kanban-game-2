import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card, GameConfig, Member, SimulationParams, Specialty, TaskKind } from '../simulation/types';
import { mergeSpecialtyByTaskKind, TASK_KINDS } from '../simulation/taskKinds';
import { JOB_ROLES } from '../simulation/rolesCatalog';
import { diceMaxForMember, ensureSynergyKeys, splitWork } from '../simulation/engine';
import { STORY_WORK_MULTIPLIER } from '../simulation/storyScale';
import { SynergyMatrix } from './SynergyMatrix';
import { MemberSynergyPanel } from './MemberSynergyPanel';
import { directedKey, pairKey } from '../simulation/synergy';
import {
  buildClassicBacklogCard,
  pickRandomClassicTemplate,
} from '../setup/classicCsTaskPool';
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

function stageUnitsForForm(c: Card): { wa: number; wd: number; wt: number } {
  if (c.workAnalise !== undefined && c.workDev !== undefined && c.workTeste !== undefined) {
    return {
      wa: Math.max(0, Math.round(c.workAnalise)),
      wd: Math.max(0, Math.round(c.workDev)),
      wt: Math.max(0, Math.round(c.workTeste)),
    };
  }
  return splitWork(Math.max(1, c.points));
}

export function SetupScreen({ value, onChange, onStart }: Props) {
  const { t } = useTranslation();
  const synergy = useMemo(
    () => ensureSynergyKeys(value.members, value.synergyByPair),
    [value.members, value.synergyByPair],
  );

  const errors: string[] = [];
  if (value.members.length === 0) errors.push(t('errors.atLeastOneMember'));
  for (const c of value.backlogCards) {
    const seen = new Set(c.assigneeIds);
    if (seen.size !== c.assigneeIds.length) {
      errors.push(t('errors.assigneesMustBeDistinct', { title: c.title }));
    }
  }

  function patchParams(p: Partial<SimulationParams>) {
    onChange({ ...value, params: { ...value.params, ...p } });
  }

  const sprintCalendar = useMemo(() => {
    const daysPerSprint = value.params.daysPerSprint;
    const numSprints = value.params.numSprints;
    const totalSteps = numSprints * (daysPerSprint + 1);
    return { daysPerSprint, numSprints, totalSteps };
  }, [value.params.daysPerSprint, value.params.numSprints]);

  function setDaysPerSprint(raw: number) {
    const v = Math.round(Number(raw));
    const next = Number.isFinite(v) ? v : 10;
    patchParams({ daysPerSprint: Math.max(3, Math.min(30, next)) });
  }

  function setNumSprints(raw: number) {
    const v = Math.round(Number(raw));
    const next = Number.isFinite(v) ? v : 3;
    patchParams({ numSprints: Math.max(1, Math.min(50, next)) });
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

  function patchCardStageWork(i: number, field: 'workAnalise' | 'workDev' | 'workTeste', raw: number) {
    const c = value.backlogCards[i]!;
    const cur = stageUnitsForForm(c);
    const v = Math.max(0, Math.round(Number(raw) || 0));
    let wa = field === 'workAnalise' ? v : cur.wa;
    const wd = field === 'workDev' ? v : cur.wd;
    const wt = field === 'workTeste' ? v : cur.wt;
    if (wa + wd + wt < 1) wa = 1;
    const points = wa + wd + wt;
    patchCard(i, { workAnalise: wa, workDev: wd, workTeste: wt, points });
  }

  function removeCard(i: number) {
    onChange({ ...value, backlogCards: value.backlogCards.filter((_, j) => j !== i) });
  }

  function patchTaskKindSpecialty(kind: TaskKind, sp: Specialty) {
    onChange({
      ...value,
      specialtyByTaskKind: { ...(value.specialtyByTaskKind ?? {}), [kind]: sp },
    });
  }

  function addCard() {
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const roughDaysPerSprint = value.params.daysPerSprint + 2;
    const roughLastDay = Math.max(roughDaysPerSprint, value.params.numSprints * roughDaysPerSprint);
    const { wa, wd, wt } = splitWork(5 * STORY_WORK_MULTIPLIER);
    const card: Card = {
      id,
      title: t('setup.defaults.newStoryTitle'),
      points: wa + wd + wt,
      workAnalise: wa,
      workDev: wd,
      workTeste: wt,
      taskKind: 'backend',
      assigneeIds: [],
      businessValue: 8000,
      dueGlobalDay: Math.max(5, roughLastDay - 8),
    };
    onChange({ ...value, backlogCards: [...value.backlogCards, card] });
  }

  function addClassicRandomTask() {
    const template = pickRandomClassicTemplate();
    const id = `c-cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = t(`setup.classicTasks.${template.key}`);
    const card = buildClassicBacklogCard({
      id,
      title,
      params: value.params,
      template,
    });
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
                <option value="">{t('setup.jobRoleNone')}</option>
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
        <h2>{t('setup.taskKindMappingTitle')}</h2>
        <p className="muted small task-kind-mapping-intro">{t('setup.taskKindMappingHint')}</p>
        <table className="data-table task-kind-mapping-table">
          <thead>
            <tr>
              <th>{t('setup.tableTaskKind')}</th>
              <th>{t('setup.tableSpecialistCargo')}</th>
            </tr>
          </thead>
          <tbody>
            {TASK_KINDS.map((k) => {
              const smap = mergeSpecialtyByTaskKind(value);
              return (
                <tr key={k}>
                  <td>{t(`taskKind.${k}`)}</td>
                  <td>
                    <select
                      className="input"
                      value={smap[k]}
                      onChange={(e) => patchTaskKindSpecialty(k, e.target.value as Specialty)}
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>
                          {t(`specialty.${s}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel setup-backlog-panel">
        <div className="setup-backlog-head">
          <h2>{t('setup.backlogTitle')}</h2>
          <div className="setup-backlog-actions">
            <button type="button" className="btn secondary" onClick={addCard}>
              {t('setup.addCard')}
            </button>
            <button
              type="button"
              className="btn secondary"
              title={t('setup.classicTasksHint')}
              onClick={addClassicRandomTask}
            >
              {t('setup.classicTaskButton')}
            </button>
          </div>
        </div>
        <p className="muted small setup-backlog-note">{t('setup.assigneeDragIntro')}</p>
        <p className="muted small backlog-stage-hint">{t('setup.tableStageWorkHint')}</p>
        <table className="data-table backlog-table">
          <thead>
            <tr>
              <th>{t('setup.tableTitle')}</th>
              <th>{t('setup.tableTaskKind')}</th>
              <th className="narrow-num">{t('setup.tableWorkAnalise')}</th>
              <th className="narrow-num">{t('setup.tableWorkDev')}</th>
              <th className="narrow-num">{t('setup.tableWorkTeste')}</th>
              <th className="narrow-num">{t('setup.tablePointsSum')}</th>
              <th>{t('setup.tableBusinessValue')}</th>
              <th>{t('setup.tableDueGlobalDay')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {value.backlogCards.map((c, i) => {
              const st = stageUnitsForForm(c);
              const sumPts = st.wa + st.wd + st.wt;
              return (
              <tr key={c.id}>
                <td>
                  <input
                    className="input"
                    value={c.title}
                    onChange={(e) => patchCard(i, { title: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="input narrow"
                    value={c.taskKind ?? 'backend'}
                    onChange={(e) => patchCard(i, { taskKind: e.target.value as TaskKind })}
                  >
                    {TASK_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`taskKind.${k}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="narrow-num">
                  <input
                    type="number"
                    min={0}
                    className="input narrow"
                    value={st.wa}
                    onChange={(e) => patchCardStageWork(i, 'workAnalise', Number(e.target.value) || 0)}
                  />
                </td>
                <td className="narrow-num">
                  <input
                    type="number"
                    min={0}
                    className="input narrow"
                    value={st.wd}
                    onChange={(e) => patchCardStageWork(i, 'workDev', Number(e.target.value) || 0)}
                  />
                </td>
                <td className="narrow-num">
                  <input
                    type="number"
                    min={0}
                    className="input narrow"
                    value={st.wt}
                    onChange={(e) => patchCardStageWork(i, 'workTeste', Number(e.target.value) || 0)}
                  />
                </td>
                <td className="narrow-num backlog-sum-pts" title={t('setup.tablePointsSumHint')}>
                  {sumPts}
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    className="input narrow"
                    value={c.businessValue ?? 0}
                    onChange={(e) =>
                      patchCard(i, { businessValue: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="input narrow"
                    title={t('setup.tableDueGlobalDayHint')}
                    value={c.dueGlobalDay ?? ''}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === '') {
                        patchCard(i, { dueGlobalDay: undefined });
                        return;
                      }
                      patchCard(i, { dueGlobalDay: Math.max(1, Math.round(Number(raw) || 1)) });
                    }}
                  />
                </td>
                <td>
                  <button type="button" className="btn danger small" onClick={() => removeCard(i)}>
                    ✕
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>{t('setup.paramsTitle')}</h2>
        <div className="setup-sprint-panel">
          <h3 className="setup-subsection-title">{t('setup.params.sprintScheduleTitle')}</h3>
          <p className="muted small setup-sprint-lede">{t('setup.params.sprintScheduleLede')}</p>
          <div className="setup-sprint-controls">
            <div className="setup-sprint-field">
              <label className="setup-sprint-field-label" htmlFor="setup-dps">
                {t('setup.params.daysPerSprint')}
              </label>
              <div className="setup-sprint-inline">
                <input
                  type="range"
                  className="setup-sprint-range"
                  min={3}
                  max={30}
                  step={1}
                  value={sprintCalendar.daysPerSprint}
                  onChange={(e) => setDaysPerSprint(Number(e.target.value))}
                  aria-label={t('setup.params.daysPerSprintRangeAria', { n: sprintCalendar.daysPerSprint })}
                />
                <input
                  id="setup-dps"
                  type="number"
                  min={3}
                  max={30}
                  className="input setup-sprint-num"
                  value={value.params.daysPerSprint}
                  onChange={(e) => setDaysPerSprint(Number(e.target.value))}
                />
              </div>
              <p className="muted small setup-sprint-hint">{t('setup.params.daysPerSprintHint')}</p>
            </div>
            <div className="setup-sprint-field">
              <label className="setup-sprint-field-label" htmlFor="setup-ns">
                {t('setup.params.numSprints')}
              </label>
              <div className="setup-sprint-inline">
                <input
                  type="range"
                  className="setup-sprint-range"
                  min={1}
                  max={50}
                  step={1}
                  value={sprintCalendar.numSprints}
                  onChange={(e) => setNumSprints(Number(e.target.value))}
                  aria-label={t('setup.params.numSprintsRangeAria', { n: sprintCalendar.numSprints })}
                />
                <input
                  id="setup-ns"
                  type="number"
                  min={1}
                  max={50}
                  className="input setup-sprint-num"
                  value={value.params.numSprints}
                  onChange={(e) => setNumSprints(Number(e.target.value))}
                />
              </div>
              <p className="muted small setup-sprint-hint">{t('setup.params.numSprintsHint')}</p>
            </div>
          </div>
          <p className="setup-sprint-summary" role="status">
            {t('setup.params.sprintSummary', {
              totalSteps: sprintCalendar.totalSteps,
              numSprints: sprintCalendar.numSprints,
              daysPerSprint: sprintCalendar.daysPerSprint,
            })}
          </p>
        </div>
        <div className="params-grid">
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
              min={0}
              max={20}
              className="input"
              value={value.params.planningPullMax}
              onChange={(e) =>
                patchParams({
                  planningPullMax: Math.min(20, Math.max(0, Math.round(Number(e.target.value) || 0))),
                })
              }
            />
            <span className="muted small param-hint">{t('setup.params.planningPullMaxHint')}</span>
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
          <label>
            {t('setup.params.financialLateFlatPenalty')}
            <input
              type="number"
              min={0}
              step={50}
              className="input"
              value={value.params.financialLateFlatPenalty ?? 800}
              onChange={(e) =>
                patchParams({ financialLateFlatPenalty: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label>
            {t('setup.params.financialLatePerDayPenalty')}
            <input
              type="number"
              min={0}
              step={50}
              className="input"
              value={value.params.financialLatePerDayPenalty ?? 250}
              onChange={(e) =>
                patchParams({ financialLatePerDayPenalty: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label>
            {t('setup.params.financialNotDeliveredMultiplier')}
            <input
              type="number"
              min={0}
              max={3}
              step={0.1}
              className="input"
              value={value.params.financialNotDeliveredMultiplier ?? 1}
              onChange={(e) =>
                patchParams({
                  financialNotDeliveredMultiplier: Math.min(
                    3,
                    Math.max(0, Number(e.target.value) || 1),
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
