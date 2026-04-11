export type Specialty = 'Analista' | 'Desenvolvedor' | 'Testador';

export type ColumnId =
  | 'backlog'
  | 'ready'
  | 'analise'
  | 'dev'
  | 'teste'
  | 'deploy';

export type TraitKind = 'quality' | 'flaw';

/** Numeric knobs traits can modify; unused fields stay 0. */
export interface TraitEffects {
  diceMaxDelta: number;
  specialistBonusDelta: number;
  handoffMultiplierDelta: number;
  collabMultiplierDelta: number;
  maxWipDelta: number;
  reworkChanceDelta: number;
}

export interface TraitDefinition {
  id: string;
  kind: TraitKind;
  effects: TraitEffects;
}

/** Efeitos de um papel de trabalho (somados entre membros que têm esse papel). */
export interface JobRoleEffects {
  /**
   * Bónus multiplicativo à capacidade efetiva do dia para cada membro com este `specialty` no quadro.
   * Ex.: `Desenvolvedor: 0.15` → +15% para todos os Devs (inclui o próprio Tech Lead se for Dev).
   * Vários papéis no time somam até um teto interno no motor.
   */
  globalCapacityMultBonusForSpecialty?: Partial<Record<Specialty, number>>;
  /**
   * Soma em todo o time: reduz a probabilidade de retrabalho em handoffs (valor absoluto antes do clamp final).
   * Ex.: `0.06` ≈ −6 pontos percentuais; vários Scrum Masters somam até um teto no motor.
   */
  globalHandoffReworkChanceReduction?: number;
}

export interface JobRoleDefinition {
  id: string;
  effects: JobRoleEffects;
}

export interface Member {
  id: string;
  name: string;
  specialty: Specialty;
  /**
   * Intervalo inclusivo de pontos de entrega sorteados **antes** de multiplicadores (coluna de especialidade, traços, papéis).
   * Se omitido, o motor usa 1…`diceMax` (legado, máx. do “dado” com traços).
   */
  deliveryMin?: number;
  deliveryMax?: number;
  /** Papel extra (ex.: Tech Lead); opcional. */
  jobRoleId?: string;
  traitQualityId?: string;
  traitFlawId?: string;
  /**
   * Ajuste extra de sinergia quando o outro envolvido tem este cargo (somado à sinergia do par em `synergyByPair`).
   * Valores tipicamente em [-1, 1], combinados e limitados no motor.
   */
  synergyByCounterpartySpecialty?: Partial<Record<Specialty, number>>;
}

export interface Card {
  id: string;
  title: string;
  points: number;
  collaborative: boolean;
  /** 1 or 2 ids; used for synergy on Dev + handoff Dev→Teste */
  assigneeIds: string[];
}

export interface BoardCard extends Card {
  workAnalise: number;
  workDev: number;
  workTeste: number;
  remainingInStage: number;
}

export type CeremonyKind =
  | 'sprint_planning'
  | 'daily_scrum'
  | 'sprint_review'
  | 'retrospective';

export interface SimulationParams {
  daysPerSprint: number;
  numSprints: number;
  seed: number;
  /** Max cards per workflow column (analise/dev/teste) */
  wipPerColumn: number;
  /** Max cards moved backlog→ready per planning */
  planningPullMax: number;
  synergyBeta: number;
  synergyGamma: number;
  collabEffMin: number;
  collabEffMax: number;
  handoffEffMin: number;
  handoffEffMax: number;
  /** If handoff synergy below this, chance of rework */
  handoffReworkSynergyThreshold: number;
  reworkUnits: number;
  /**
   * Probabilidade (0–1) de ocorrer um evento aleatório num dia útil (Daily ou Sprint Review).
   * 0 desativa. Ver `dailyRandomEvents.ts` / lista na UI.
   */
  dailyRandomEventChance?: number;
}

export interface GameConfig {
  members: Member[];
  /** symmetric: key `${idA}|${idB}` with idA < idB lexicographically */
  synergyByPair: Record<string, number>;
  /**
   * Por par (`pairKey`): se `false`, a sinergia base usa `synergyDirected` (ver `directedKey`).
   * Ausente = bi-direcional (usa só `synergyByPair`).
   */
  synergyPairBidirectional?: Record<string, boolean>;
  /** Sinergia base dirigida remetente→destinatário; usada quando o par não é bi-direcional. */
  synergyDirected?: Record<string, number>;
  backlogCards: Card[];
  params: SimulationParams;
}

/** Subconjunto da config usado no motor para resolver sinergia. */
export type SynergyRuntime = {
  synergyByPair: Record<string, number>;
  synergyPairBidirectional?: Record<string, boolean>;
  synergyDirected?: Record<string, number>;
};

/** Structured log line for UI i18n (key into locale JSON). */
export interface LogNote {
  key: string;
  params?: Record<string, string | number>;
}

/** Evento aleatório aplicado num dia útil (referência ao catálogo em `dailyRandomEvents.ts`). */
export interface DailyRandomEventLog {
  eventId: string;
  affectedMemberIds?: string[];
}

export interface DayLog {
  globalDay: number;
  sprint: number;
  dayInSprint: number;
  ceremony: CeremonyKind;
  /** Sorteio base no intervalo de entrega (antes de multiplicadores de especialista / papéis). */
  diceByMemberId: Record<string, number>;
  effectiveCapacityByMemberId: Record<string, number>;
  columnCounts: Record<ColumnId, number>;
  notes: LogNote[];
  /** Eventos aleatórios do dia (só dias úteis com trabalho). */
  dailyRandomEvents?: DailyRandomEventLog[];
}

export interface CompletedCardTiming {
  cardId: string;
  enteredReadyGlobalDay: number;
  deployedGlobalDay: number;
  cycleTimeDays: number;
}

export interface SimulationResult {
  logs: DayLog[];
  completed: CompletedCardTiming[];
  finalBoard: BoardState;
}

export interface BoardState {
  columns: Record<ColumnId, string[]>;
  cardsById: Record<string, BoardCard>;
}

export const COLUMN_ORDER: ColumnId[] = [
  'backlog',
  'ready',
  'analise',
  'dev',
  'teste',
  'deploy',
];

export function specialtyForColumn(col: ColumnId): Specialty | null {
  if (col === 'analise') return 'Analista';
  if (col === 'dev') return 'Desenvolvedor';
  if (col === 'teste') return 'Testador';
  return null;
}
