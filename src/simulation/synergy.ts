import type { Member } from './types';

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

/** Chave para sinergia dirigida de `fromId` em direção a `toId`. */
export function directedKey(fromId: string, toId: string): string {
  return `${fromId}>>${toId}`;
}

/** `true` quando o par usa matriz simétrica (padrão se a chave não existir). */
export function isSynergyPairBidirectional(
  synergyPairBidirectional: Record<string, boolean> | undefined,
  idA: string,
  idB: string,
): boolean {
  const pk = pairKey(idA, idB);
  return synergyPairBidirectional?.[pk] !== false;
}

function baseSynergyCollaboration(
  synergyByPair: Record<string, number>,
  pairBidirectional: Record<string, boolean> | undefined,
  directed: Record<string, number> | undefined,
  idA: string,
  idB: string,
): number {
  if (isSynergyPairBidirectional(pairBidirectional, idA, idB)) {
    return getSynergy(synergyByPair, idA, idB);
  }
  const dAB = directed?.[directedKey(idA, idB)];
  const dBA = directed?.[directedKey(idB, idA)];
  if (dAB !== undefined && dBA !== undefined) return (dAB + dBA) / 2;
  if (dAB !== undefined) return dAB;
  if (dBA !== undefined) return dBA;
  return getSynergy(synergyByPair, idA, idB);
}

/** Handoff: com par assimétrico usa só a percepção do remetente em relação ao destinatário. */
function baseSynergyHandoff(
  synergyByPair: Record<string, number>,
  pairBidirectional: Record<string, boolean> | undefined,
  directed: Record<string, number> | undefined,
  outId: string,
  inId: string,
): number {
  if (isSynergyPairBidirectional(pairBidirectional, outId, inId)) {
    return getSynergy(synergyByPair, outId, inId);
  }
  const dOutIn = directed?.[directedKey(outId, inId)];
  if (dOutIn !== undefined) return dOutIn;
  return getSynergy(synergyByPair, outId, inId);
}

export type ResolveSynergyOpts = {
  synergyPairBidirectional?: Record<string, boolean>;
  synergyDirected?: Record<string, number>;
  /** Colaboração: média das direções; handoff: só out→in quando assimétrico. */
  mode?: 'collaboration' | 'handoff';
};

export function getSynergy(
  synergyByPair: Record<string, number>,
  idA: string,
  idB: string,
): number {
  if (idA === idB) return 0;
  const k = pairKey(idA, idB);
  return synergyByPair[k] ?? 0;
}

/** Sinergia do par (matriz ou dirigida) + ajustes por cargo de cada um em relação ao cargo do outro. */
export function resolveSynergy(
  members: Member[],
  synergyByPair: Record<string, number>,
  idA: string,
  idB: string,
  opts?: ResolveSynergyOpts,
): number {
  if (idA === idB) return 0;
  const mode = opts?.mode ?? 'collaboration';
  const pb = opts?.synergyPairBidirectional;
  const dir = opts?.synergyDirected;
  const base =
    mode === 'handoff'
      ? baseSynergyHandoff(synergyByPair, pb, dir, idA, idB)
      : baseSynergyCollaboration(synergyByPair, pb, dir, idA, idB);
  const ma = members.find((m) => m.id === idA);
  const mb = members.find((m) => m.id === idB);
  if (!ma || !mb) return clamp(base, -1, 1);
  let delta = 0;
  const da = ma.synergyByCounterpartySpecialty?.[mb.specialty];
  const db = mb.synergyByCounterpartySpecialty?.[ma.specialty];
  if (da !== undefined) delta += da;
  if (db !== undefined) delta += db;
  return clamp(base + delta, -1, 1);
}

export function averageTeamSynergy(
  members: Member[],
  synergyByPair: Record<string, number>,
  opts?: ResolveSynergyOpts,
): number {
  const ids = members.map((m) => m.id);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      sum += resolveSynergy(members, synergyByPair, ids[i], ids[j], {
        ...opts,
        mode: 'collaboration',
      });
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}
