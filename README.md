# Kanban + Synergy — developer guide

Web app (**React 19**, **TypeScript**, **Vite**) with a **discrete-event simulation engine** in TypeScript. There is **no backend**: the engine, presets, and export/import run entirely in the browser.

**Portuguese version of this document:** [README.pt-BR.md](README.pt-BR.md)

## What you are developing

| Area | Path | Role |
|------|------|------|
| Simulation core | [`src/simulation/`](src/simulation/) | Board state, ceremonies, capacity, handoffs, synergy, financial summaries, metrics (CFD, etc.). |
| Game config & defaults | [`src/gameDefaults.ts`](src/gameDefaults.ts), [`src/simulation/storyScale.ts`](src/simulation/storyScale.ts) | Default team, backlog, params; global multiplier for per-stage work units. |
| Backlog generators | [`src/setup/`](src/setup/) | “Classic” task pool + titles (i18n keys); random due/value helpers. |
| UI — setup | [`src/components/SetupScreen.tsx`](src/components/SetupScreen.tsx) | Team, synergy matrix, task-kind → specialist mapping, backlog table, sprint calendar panel, params. |
| UI — play | [`src/components/PlayScreen.tsx`](src/components/PlayScreen.tsx), [`KanbanBoard.tsx`](src/components/KanbanBoard.tsx) | `createInteractiveRunner`, day advance, DnD cards/assignees, errors. |
| Copy & languages | [`src/locales/en.json`](src/locales/en.json) (primary copy), `pt-BR.json`, `es.json` | All user-facing strings; add keys in all three when you ship a feature. |
| Formulas (pedagogy) | [`src/components/AboutScreen.tsx`](src/components/AboutScreen.tsx) | Renders `about.*` strings from the same locale files. |
| App shell | [`src/App.tsx`](src/App.tsx) | Phases `setup` \| `playing`, preset `localStorage`, About toggle, import/export JSON. |

Public API of the engine is re-exported from [`src/simulation/index.ts`](src/simulation/index.ts) (e.g. `createInteractiveRunner`, `splitWork`, `resolveAssigneesForCard`).

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build   # tsc -b && vite build
npm run lint
npm run preview # optional: serve dist/
```

### Paper pipeline (optional)

LaTeX and figure scripts live under [`paper/`](paper/) and are **not** part of the Vite bundle. See [`paper/README.md`](paper/README.md).

```bash
npm run paper:figures
npm run paper:pdf   # paper/sbpo2026.pdf (pt-BR, babel brazil); needs local LaTeX
```

## Extending the tool (checklist)

1. **Types** — extend [`src/simulation/types.ts`](src/simulation/types.ts) if you add fields to `GameConfig`, `SimulationParams`, or `Card`.
2. **Engine** — implement behaviour in [`src/simulation/engine.ts`](src/simulation/engine.ts) (or a new module imported from there); keep rounding/caps aligned with **About** text.
3. **UI** — wire screens in `SetupScreen` / `PlayScreen`; reuse patterns from [`AssigneeSlotsRow`](src/components/AssigneeSlotsRow.tsx) and [`assigneeDnD.ts`](src/components/assigneeDnD.ts) for drag-and-drop.
4. **i18n** — add the same keys to `en.json`, `pt-BR.json`, and `es.json` under the appropriate namespace (`setup`, `play`, `about`, …).
5. **Defaults** — update [`gameDefaults.ts`](src/gameDefaults.ts) if the first-run experience should change.

## Deploy (Vercel)

Static site: build output is `dist/`.

1. Push the repo to GitHub/GitLab/Bitbucket.
2. [vercel.com/new](https://vercel.com/new) → import project; Vite is auto-detected (`vercel.json` sets `outputDirectory: dist`).
3. Use **Node ≥ 20** (`package.json` `engines`).

[`vercel.json`](vercel.json) includes SPA fallback to `index.html`. [`.vercelignore`](.vercelignore) excludes `paper/` from uploads.

```bash
npx vercel        # preview
npx vercel --prod # production
```

If you later set a non-root Vite `base`, update `vite.config.ts` and Vercel rewrites accordingly.
