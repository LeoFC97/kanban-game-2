import { useTranslation } from 'react-i18next';
import type { Member, Specialty } from '../simulation/types';
import { directedKey, isSynergyPairBidirectional, pairKey } from '../simulation/synergy';

const ROLES: Specialty[] = ['Analista', 'Desenvolvedor', 'Testador'];

type Props = {
  self: Member;
  members: Member[];
  synergyByPair: Record<string, number>;
  synergyPairBidirectional?: Record<string, boolean>;
  synergyDirected?: Record<string, number>;
  onPairChange: (idA: string, idB: string, value: number) => void;
  onDirectedChange: (fromId: string, toId: string, value: number) => void;
  onPairBidirectionalChange: (idA: string, idB: string, bidirectional: boolean) => void;
  onRoleDeltaChange: (memberId: string, counterpartySpecialty: Specialty, value: number | null) => void;
};

export function MemberSynergyPanel({
  self,
  members,
  synergyByPair,
  synergyPairBidirectional,
  synergyDirected,
  onPairChange,
  onDirectedChange,
  onPairBidirectionalChange,
  onRoleDeltaChange,
}: Props) {
  const { t } = useTranslation();
  const others = members.filter((m) => m.id !== self.id);

  return (
    <div className="member-synergy-panel">
      <h4 className="member-synergy-subtitle">{t('setup.memberSynergy.byPersonTitle')}</h4>
      <p className="member-synergy-hint">{t('setup.memberSynergy.byPersonHint')}</p>
      {others.length === 0 ? (
        <p className="muted small">{t('setup.memberSynergy.needAnotherMember')}</p>
      ) : (
        <ul className="member-synergy-pairs">
          {others.map((other) => {
            const k = pairKey(self.id, other.id);
            const bidirectional = isSynergyPairBidirectional(synergyPairBidirectional, self.id, other.id);
            const dk = directedKey(self.id, other.id);
            const vPair = synergyByPair[k] ?? 0;
            const vDir = synergyDirected?.[dk] ?? vPair;
            const v = bidirectional ? vPair : vDir;
            return (
              <li key={other.id} className="member-synergy-pair-row person-pair">
                <span className="pair-label">
                  {bidirectional ? (
                    <>
                      {self.name} ↔ {other.name}
                    </>
                  ) : (
                    <>
                      {self.name} → {other.name}
                    </>
                  )}
                </span>
                <label className="pair-bidir">
                  <input
                    type="checkbox"
                    checked={bidirectional}
                    onChange={(e) => onPairBidirectionalChange(self.id, other.id, e.target.checked)}
                  />
                  <span>{t('setup.memberSynergy.bidirectional')}</span>
                </label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={Math.round(v * 100)}
                  onChange={(e) => {
                    const nv = Number(e.target.value) / 100;
                    if (bidirectional) onPairChange(self.id, other.id, nv);
                    else onDirectedChange(self.id, other.id, nv);
                  }}
                />
                <span className="synergy-val">{v.toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <h4 className="member-synergy-subtitle">{t('setup.memberSynergy.byRoleTitle')}</h4>
      <p className="member-synergy-hint">{t('setup.memberSynergy.byRoleHint')}</p>
      <ul className="member-synergy-roles">
        {ROLES.map((sp) => {
          const v = self.synergyByCounterpartySpecialty?.[sp] ?? 0;
          return (
            <li key={sp} className="member-synergy-pair-row role-pair">
              <span className="pair-label">
                {t('setup.memberSynergy.withRole', { role: t(`specialty.${sp}`) })}
              </span>
              <input
                type="range"
                min={-100}
                max={100}
                value={Math.round(v * 100)}
                onChange={(e) => {
                  const nv = Number(e.target.value) / 100;
                  onRoleDeltaChange(self.id, sp, nv === 0 ? null : nv);
                }}
              />
              <span className="synergy-val">{v.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
