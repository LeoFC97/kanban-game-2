import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSimulation } from '../src/simulation/engine';
import { buildCfdSeries } from '../src/simulation/metrics';
import type { CompletedCardTiming, DayLog } from '../src/simulation/types';
import { EXPERIMENT_PARAMS, SCENARIOS } from './paperScenarios';

const __dirname = dirname(fileURLToPath(import.meta.url));
const paperDir = join(__dirname, '..', 'paper');
const figDir = join(paperDir, 'figures');
const dataDir = join(paperDir, 'data');

mkdirSync(figDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sprintOfGlobalDay(logs: DayLog[], globalDay: number): number {
  const log = logs.find((l) => l.globalDay === globalDay);
  return log?.sprint ?? 1;
}

function throughputBySprint(
  logs: DayLog[],
  completed: CompletedCardTiming[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const c of completed) {
    const sp = sprintOfGlobalDay(logs, c.deployedGlobalDay);
    out[sp] = (out[sp] ?? 0) + 1;
  }
  return out;
}

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function writeCfdCsv(series: ReturnType<typeof buildCfdSeries>, outPath: string): void {
  const header = 'day,backlog,analise,dev,teste,deploy\n';
  const body = series
    .map(
      (r) =>
        `${r.globalDay},${r.backlog},${r.analise},${r.dev},${r.teste},${r.deploy}`,
    )
    .join('\n');
  writeFileSync(outPath, header + body + '\n', 'utf8');
}

function writeCfdTikzFigure(csvRelative: string, outPath: string): void {
  const tex = `% Gerado por scripts/generate-paper-figures.ts
\\begin{tikzpicture}
\\begin{axis}[
  width=0.95\\linewidth,
  height=5.4cm,
  xmin=1,
  xlabel={Dia global},
  ylabel={Cartões por coluna},
  legend columns=3,
  legend style={font=\\scriptsize,at={(0.5,1.02)},anchor=south},
]
\\addplot[thick,const plot,color=black!70] table[col sep=comma,x=day,y=backlog]{${csvRelative}};
\\addplot[thick,const plot,color=violet!80] table[col sep=comma,x=day,y=analise]{${csvRelative}};
\\addplot[thick,const plot,color=teal!80] table[col sep=comma,x=day,y=dev]{${csvRelative}};
\\addplot[thick,const plot,color=orange!90] table[col sep=comma,x=day,y=teste]{${csvRelative}};
\\addplot[thick,const plot,color=red!80] table[col sep=comma,x=day,y=deploy]{${csvRelative}};
\\legend{Backlog,Análise,Dev,Teste,Deploy}
\\end{axis}
\\end{tikzpicture}
`;
  writeFileSync(outPath, tex, 'utf8');
}

function writeBarCycleTikz(
  outPath: string,
  a: number,
  b: number,
  c: number,
  d: number,
): void {
  const tex = `% Gerado por scripts/generate-paper-figures.ts
\\begin{tikzpicture}
\\begin{axis}[
  width=0.62\\linewidth,
  height=5cm,
  ybar,
  ymin=0,
  symbolic x coords={A,B,C,D},
  xtick=data,
  xticklabel style={align=center},
  ylabel={Média de ciclo (dias)},
  nodes near coords,
  nodes near coords align={vertical},
  bar width=16pt,
]
\\addplot[fill=blue!55] coordinates {(A,${a}) (B,${b}) (C,${c}) (D,${d})};
\\end{axis}
\\end{tikzpicture}
`;
  writeFileSync(outPath, tex, 'utf8');
}

function writeCfdSvg(
  logs: DayLog[],
  title: string,
  outPath: string,
): void {
  const series = buildCfdSeries(logs);
  const days = series.map((r) => r.globalDay);
  const maxDay = days[days.length - 1] ?? 1;
  const keys = ['backlog', 'analise', 'dev', 'teste', 'deploy'] as const;
  const colors = ['#444', '#7b1fa2', '#388e3c', '#f57c00', '#c62828'];
  const W = 720;
  const H = 260;
  const m = { l: 48, r: 16, t: 28, b: 40 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;
  const maxY = Math.max(
    1,
    ...series.flatMap((r) => keys.map((k) => r[k] as number)),
  );
  const xScale = (d: number) => m.l + ((d - 1) / Math.max(1, maxDay - 1)) * innerW;
  const yScale = (y: number) => m.t + innerH - (y / maxY) * innerH;
  const paths = keys.map((k, idx) => {
    const pts = series.map((r) => {
      const x = xScale(r.globalDay);
      const y = yScale(r[k] as number);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `<polyline fill="none" stroke="${colors[idx]}" stroke-width="2" points="${pts.join(' ')}" />`;
  });
  const legendPt: Record<string, string> = {
    backlog: 'Backlog',
    analise: 'Análise',
    dev: 'Dev',
    teste: 'Teste',
    deploy: 'Deploy',
  };
  const legend = keys
    .map(
      (k, idx) =>
        `<text x="${W - 120}" y="${16 + idx * 14}" font-size="11" fill="${colors[idx]}">${esc(legendPt[k] ?? k)}</text>`,
    )
    .join('\n');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${m.l}" y="18" font-size="14" font-weight="bold">${esc(title)}</text>
  <line x1="${m.l}" y1="${m.t + innerH}" x2="${m.l + innerW}" y2="${m.t + innerH}" stroke="#333"/>
  <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + innerH}" stroke="#333"/>
  ${paths.join('\n')}
  <text x="${m.l}" y="${H - 10}" font-size="11" fill="#333">Dia global</text>
  <text transform="translate(14,${m.t + innerH / 2}) rotate(-90)" font-size="11" fill="#333">Cartões por coluna</text>
  ${legend}
</svg>`;
  writeFileSync(outPath, svg, 'utf8');
}

function writeBarMeanCycleSvg(
  labels: string[],
  values: number[],
  outPath: string,
): void {
  const W = 560;
  const H = 260;
  const m = { l: 52, r: 16, t: 36, b: 72 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;
  const maxV = Math.max(1, ...values);
  const n = labels.length;
  const bw = (innerW / n) * 0.62;
  const gap = (innerW / n) * 0.38;
  const bars = labels
    .map((lb, i) => {
      const v = values[i] ?? 0;
      const x = m.l + i * (bw + gap) + gap * 0.25;
      const h = (v / maxV) * innerH;
      const y = m.t + innerH - h;
      const val = v.toFixed(1);
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="#3949ab"/>
<text x="${x + bw / 2}" y="${y - 6}" font-size="11" text-anchor="middle" fill="#111">${val}</text>
<text x="${x + bw / 2}" y="${H - 18}" font-size="10" text-anchor="middle" fill="#111">${esc(lb)}</text>`;
    })
    .join('\n');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${m.l}" y="20" font-size="14" font-weight="bold">Tempo médio de ciclo (Pronto→Deploy) por cenário</text>
  <line x1="${m.l}" y1="${m.t + innerH}" x2="${m.l + innerW}" y2="${m.t + innerH}" stroke="#333"/>
  <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + innerH}" stroke="#333"/>
  ${bars}
</svg>`;
  writeFileSync(outPath, svg, 'utf8');
}

function writeThroughputSvg(
  series: { id: string; label: string; perSprint: Record<number, number> }[],
  maxSprint: number,
  outPath: string,
): void {
  const W = 640;
  const H = 280;
  const m = { l: 48, r: 20, t: 32, b: 44 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;
  const colors = ['#3949ab', '#00897b', '#e53935', '#fb8c00'];
  const maxY = Math.max(
    1,
    ...series.flatMap((s) =>
      Array.from({ length: maxSprint }, (_, i) => s.perSprint[i + 1] ?? 0),
    ),
  );
  const xScale = (sp: number) =>
    m.l + ((sp - 1) / Math.max(1, maxSprint - 1)) * innerW;
  const yScale = (y: number) => m.t + innerH - (y / maxY) * innerH;
  const lines = series.map((s, idx) => {
    const pts: string[] = [];
    for (let sp = 1; sp <= maxSprint; sp++) {
      const yv = s.perSprint[sp] ?? 0;
      pts.push(`${xScale(sp).toFixed(1)},${yScale(yv).toFixed(1)}`);
    }
    return `<polyline fill="none" stroke="${colors[idx % colors.length]}" stroke-width="2.5" points="${pts.join(' ')}" />`;
  });
  const leg = series
    .map((s, idx) => {
      const lx = m.l + idx * 88;
      return `<text x="${lx}" y="${H - 12}" font-size="11" fill="${colors[idx % colors.length]}">${esc(s.label)}</text>`;
    })
    .join('\n');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${m.l}" y="20" font-size="14" font-weight="bold">Throughput por sprint (cartões concluídos)</text>
  <line x1="${m.l}" y1="${m.t + innerH}" x2="${m.l + innerW}" y2="${m.t + innerH}" stroke="#333"/>
  <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + innerH}" stroke="#333"/>
  ${lines.join('\n')}
  ${leg}
</svg>`;
  writeFileSync(outPath, svg, 'utf8');
}

type SummaryRow = {
  id: string;
  title: string;
  completed: number;
  meanCycleTime: number;
  medianCycleTime: number;
  throughputBySprint: Record<string, number>;
};

const rows: SummaryRow[] = [];
const tpSeries: {
  id: string;
  label: string;
  perSprint: Record<number, number>;
}[] = [];

for (const sc of SCENARIOS) {
  const res = runSimulation(sc.config);
  const cfdRows = buildCfdSeries(res.logs);
  writeCfdCsv(cfdRows, join(dataDir, `cfd_${sc.id}.csv`));
  const cts = res.completed.map((c) => c.cycleTimeDays);
  const med =
    cts.length === 0
      ? 0
      : [...cts].sort((a, b) => a - b)[Math.floor(cts.length / 2)]!;
  const tp = throughputBySprint(res.logs, res.completed);
  rows.push({
    id: sc.id,
    title: sc.title,
    completed: res.completed.length,
    meanCycleTime: mean(cts),
    medianCycleTime: med,
    throughputBySprint: Object.fromEntries(
      Object.entries(tp).map(([k, v]) => [String(k), v]),
    ),
  });
  const shortLabel = sc.id.startsWith('A_')
    ? 'A'
    : sc.id.startsWith('B_')
      ? 'B'
      : sc.id.startsWith('C_')
        ? 'C'
        : sc.id.startsWith('D_')
          ? 'D'
          : sc.id;
  tpSeries.push({ id: sc.id, label: shortLabel, perSprint: tp });
  writeCfdSvg(
    res.logs,
    `CFD (contagens por coluna): ${sc.title}`,
    join(figDir, `cfd_${sc.id}.svg`),
  );
}

writeBarMeanCycleSvg(
  rows.map((r) =>
    r.id.startsWith('A_')
      ? 'A'
      : r.id.startsWith('B_')
        ? 'B'
        : r.id.startsWith('C_')
          ? 'C'
          : r.id.startsWith('D_')
            ? 'D'
            : r.id,
  ),
  rows.map((r) => r.meanCycleTime),
  join(figDir, 'bar_mean_cycle_time.svg'),
);

writeThroughputSvg(
  tpSeries,
  EXPERIMENT_PARAMS.numSprints,
  join(figDir, 'throughput_by_sprint.svg'),
);

writeFileSync(join(dataDir, 'experiment-summary.json'), JSON.stringify(rows, null, 2), 'utf8');

const p = EXPERIMENT_PARAMS;
const parametrosTex = `% Gerado por scripts/generate-paper-figures.ts — não editar à mão
\\begin{tabular}{@{}lr@{}}
  \\toprule
  Parâmetro & Valor \\\\
  \\midrule
  \\texttt{daysPerSprint} & ${p.daysPerSprint} \\\\
  \\texttt{numSprints} & ${p.numSprints} \\\\
  \\texttt{seed} & ${p.seed} \\\\
  \\texttt{wipPerColumn} & ${p.wipPerColumn} \\\\
  \\texttt{planningPullMax} & ${p.planningPullMax} \\\\
  \\texttt{synergyBeta} & ${p.synergyBeta} \\\\
  \\texttt{synergyGamma} & ${p.synergyGamma} \\\\
  \\texttt{collabEffMin} / \\texttt{collabEffMax} & ${p.collabEffMin} / ${p.collabEffMax} \\\\
  \\texttt{handoffEffMin} / \\texttt{handoffEffMax} & ${p.handoffEffMin} / ${p.handoffEffMax} \\\\
  \\texttt{handoffReworkSynergyThreshold} & ${p.handoffReworkSynergyThreshold} \\\\
  \\texttt{reworkUnits} & ${p.reworkUnits} \\\\
  \\bottomrule
\\end{tabular}
`;

writeFileSync(join(dataDir, 'parametros.tex'), parametrosTex, 'utf8');

const [rA, rB, rC, rD] = rows;
const fmt = (x: number) => x.toFixed(2);
const summaryTex = `% Gerado por scripts/generate-paper-figures.ts
\\newcommand{\\StatCompletedA}{${rA?.completed ?? 0}}
\\newcommand{\\StatMeanCtA}{${fmt(rA?.meanCycleTime ?? 0)}}
\\newcommand{\\StatMedianCtA}{${fmt(rA?.medianCycleTime ?? 0)}}
\\newcommand{\\StatCompletedB}{${rB?.completed ?? 0}}
\\newcommand{\\StatMeanCtB}{${fmt(rB?.meanCycleTime ?? 0)}}
\\newcommand{\\StatMedianCtB}{${fmt(rB?.medianCycleTime ?? 0)}}
\\newcommand{\\StatCompletedC}{${rC?.completed ?? 0}}
\\newcommand{\\StatMeanCtC}{${fmt(rC?.meanCycleTime ?? 0)}}
\\newcommand{\\StatMedianCtC}{${fmt(rC?.medianCycleTime ?? 0)}}
\\newcommand{\\StatCompletedD}{${rD?.completed ?? 0}}
\\newcommand{\\StatMeanCtD}{${fmt(rD?.meanCycleTime ?? 0)}}
\\newcommand{\\StatMedianCtD}{${fmt(rD?.medianCycleTime ?? 0)}}
`;
writeFileSync(join(dataDir, 'summary_stats.tex'), summaryTex, 'utf8');

writeCfdTikzFigure('data/cfd_A_baseline.csv', join(dataDir, 'fig_cfd_baseline.tex'));
writeBarCycleTikz(
  join(dataDir, 'fig_bar_cycle.tex'),
  Number(fmt(rA?.meanCycleTime ?? 0)),
  Number(fmt(rB?.meanCycleTime ?? 0)),
  Number(fmt(rC?.meanCycleTime ?? 0)),
  Number(fmt(rD?.meanCycleTime ?? 0)),
);

const maxSprint = EXPERIMENT_PARAMS.numSprints;
const tpHeader = 'sprint,A,B,C,D\n';
const tpBody = Array.from({ length: maxSprint }, (_, i) => {
  const sp = i + 1;
  const key = String(sp);
  const a = rows[0]?.throughputBySprint[key] ?? 0;
  const b = rows[1]?.throughputBySprint[key] ?? 0;
  const c = rows[2]?.throughputBySprint[key] ?? 0;
  const d = rows[3]?.throughputBySprint[key] ?? 0;
  return `${sp},${a},${b},${c},${d}`;
}).join('\n');
writeFileSync(join(dataDir, 'throughput_by_sprint.csv'), tpHeader + tpBody + '\n', 'utf8');

const tpFig = `% Gerado por scripts/generate-paper-figures.ts
\\begin{tikzpicture}
\\begin{axis}[
  width=0.95\\linewidth,
  height=5.2cm,
  xlabel={Sprint},
  ylabel={Cartões concluídos},
  xmin=1,
  xmax=${maxSprint},
  ymin=0,
  legend style={font=\\scriptsize,at={(0.5,1.02)},anchor=south},
  legend columns=4,
]
\\addplot[thick,mark=*,color=black!70] table[col sep=comma,x=sprint,y=A]{data/throughput_by_sprint.csv};
\\addplot[thick,mark=square*,color=blue!70] table[col sep=comma,x=sprint,y=B]{data/throughput_by_sprint.csv};
\\addplot[thick,mark=triangle*,color=red!75] table[col sep=comma,x=sprint,y=C]{data/throughput_by_sprint.csv};
\\addplot[thick,mark=diamond*,color=teal!80] table[col sep=comma,x=sprint,y=D]{data/throughput_by_sprint.csv};
\\legend{A,B,C,D}
\\end{axis}
\\end{tikzpicture}
`;
writeFileSync(join(dataDir, 'fig_throughput.tex'), tpFig, 'utf8');

console.log('Figuras gravadas em paper/figures e dados em paper/data/.');
