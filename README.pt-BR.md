# Kanban + Sinergia — guia para desenvolvimento

Aplicação web (**React 19**, **TypeScript**, **Vite**) com **motor de simulação a eventos discretos** em TypeScript. **Não há backend**: motor, presets e exportação/importação rodam só no navegador.

**Versão em inglês deste documento:** [README.md](README.md)

## O que se desenvolve neste repositório

| Área | Caminho | Função |
|------|---------|--------|
| Núcleo da simulação | [`src/simulation/`](src/simulation/) | Estado do quadro, ritos, capacidade, handoffs, sinergia, relatórios financeiros, métricas (CFD, etc.). |
| Configuração e defaults | [`src/gameDefaults.ts`](src/gameDefaults.ts), [`src/simulation/storyScale.ts`](src/simulation/storyScale.ts) | Equipa e backlog por defeito, parâmetros; multiplicador global de unidades de trabalho por etapa. |
| Geradores de backlog | [`src/setup/`](src/setup/) | Pool de tarefas “clássicas” + títulos (chaves i18n); sorteio de prazo/valor. |
| UI — setup | [`src/components/SetupScreen.tsx`](src/components/SetupScreen.tsx) | Equipa, matriz de sinergia, mapeamento tipo de tarefa → especialista, tabela de backlog, painel de sprints/calendário, parâmetros. |
| UI — partida | [`src/components/PlayScreen.tsx`](src/components/PlayScreen.tsx), [`KanbanBoard.tsx`](src/components/KanbanBoard.tsx) | `createInteractiveRunner`, avanço de dia, arrastar cartões/assignees, erros. |
| Textos e idiomas | [`src/locales/en.json`](src/locales/en.json) (referência principal de copy), `pt-BR.json`, `es.json` | Todas as strings da UI; ao fechar uma funcionalidade, acrescente chaves nos três ficheiros. |
| Fórmulas (pedagogia) | [`src/components/AboutScreen.tsx`](src/components/AboutScreen.tsx) | Mostra blocos `about.*` vindos dos mesmos JSON de locale. |
| Shell da app | [`src/App.tsx`](src/App.tsx) | Fases `setup` \| `playing`, preset em `localStorage`, painel Sobre, import/export JSON. |

A API pública do motor é reexportada em [`src/simulation/index.ts`](src/simulation/index.ts) (por exemplo `createInteractiveRunner`, `splitWork`, `resolveAssigneesForCard`).

## Desenvolvimento local

```bash
npm install
npm run dev
```

```bash
npm run build   # tsc -b && vite build
npm run lint
npm run preview # opcional: servir dist/
```

### Pipeline do artigo (opcional)

O LaTeX e os scripts de figuras estão em [`paper/`](paper/) e **não** entram no bundle da Vite. Ver [`paper/README.md`](paper/README.md).

```bash
npm run paper:figures
npm run paper:pdf   # gera paper/sbpo2026.pdf (texto em pt-BR); exige LaTeX local
```

## Evoluir a ferramenta (checklist)

1. **Tipos** — alargar [`src/simulation/types.ts`](src/simulation/types.ts) se adicionar campos a `GameConfig`, `SimulationParams` ou `Card`.
2. **Motor** — implementar em [`src/simulation/engine.ts`](src/simulation/engine.ts) (ou módulo novo importado dali); manter arredondamentos e tetos alinhados com o texto do **Sobre**.
3. **UI** — ligar ecrãs em `SetupScreen` / `PlayScreen`; reutilizar padrões de [`AssigneeSlotsRow`](src/components/AssigneeSlotsRow.tsx) e [`assigneeDnD.ts`](src/components/assigneeDnD.ts) para arrastar/soltar.
4. **i18n** — acrescentar as mesmas chaves em `en.json`, `pt-BR.json` e `es.json` no espaço de nomes certo (`setup`, `play`, `about`, …).
5. **Defaults** — atualizar [`gameDefaults.ts`](src/gameDefaults.ts) se a experiência “primeira abertura” mudar.

## Deploy (Vercel)

Site estático: saída de build em `dist/`.

1. Envie o repositório para GitHub/GitLab/Bitbucket.
2. [vercel.com/new](https://vercel.com/new) → importar; a Vercel deteta **Vite** (`vercel.json` com `outputDirectory: dist`).
3. Usar **Node ≥ 20** (`engines` no `package.json`).

O [`vercel.json`](vercel.json) inclui fallback SPA para `index.html`. O [`.vercelignore`](.vercelignore) exclui `paper/` do upload.

```bash
npx vercel        # preview
npx vercel --prod # produção
```

Se no futuro definir `base` não raiz no Vite, ajuste `vite.config.ts` e as rewrites na Vercel em conformidade.
