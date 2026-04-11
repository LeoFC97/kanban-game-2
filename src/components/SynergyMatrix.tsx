import { useTranslation } from 'react-i18next';
import type { Member } from '../simulation/types';
import { isSynergyPairBidirectional, pairKey } from '../simulation/synergy';

type Props = {
  members: Member[];
  synergyByPair: Record<string, number>;
  synergyPairBidirectional?: Record<string, boolean>;
  onChange: (next: Record<string, number>) => void;
};

export function SynergyMatrix({ members, synergyByPair, synergyPairBidirectional, onChange }: Props) {
  const { t } = useTranslation();
  const pairs: [Member, Member][] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      pairs.push([members[i], members[j]]);
    }
  }
  if (pairs.length === 0) {
    return <p className="muted">{t('synergy.needTwoMembers')}</p>;
  }

  function setPair(a: string, b: string, v: number) {
    const k = pairKey(a, b);
    onChange({ ...synergyByPair, [k]: v });
  }

  return (
    <div className="synergy-matrix">
      <p className="hint">{t('synergy.hint')}</p>
      <p className="hint subtle">{t('synergy.matrixSyncedWithMemberCards')}</p>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('synergy.pairHeader')}</th>
            <th>{t('synergy.valueHeader')}</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map(([x, y]) => {
            const k = pairKey(x.id, y.id);
            const v = synergyByPair[k] ?? 0;
            const bi = isSynergyPairBidirectional(synergyPairBidirectional, x.id, y.id);
            return (
              <tr key={k}>
                <td>
                  {x.name} ↔ {y.name}
                </td>
                <td>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={Math.round(v * 100)}
                    disabled={!bi}
                    title={bi ? undefined : t('synergy.matrixAsymmetricHint')}
                    onChange={(e) => setPair(x.id, y.id, Number(e.target.value) / 100)}
                  />
                  <span className="synergy-val">{v.toFixed(2)}</span>
                  {!bi && <span className="muted small matrix-asym-note">{t('synergy.matrixAsymmetricBadge')}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
