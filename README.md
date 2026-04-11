# Kanban + Sinergia

Aplicação web (React + TypeScript + Vite) com motor de simulação em `src/simulation/`. Artigo LaTeX e figuras experimentais ficam em `paper/` (não entram no bundle da Vercel).

## Desenvolvimento local

```bash
npm install
npm run dev
```

```bash
npm run build   # produção
npm run lint
```

Artigo / figuras geradas a partir do motor:

```bash
npm run paper:figures
```

## Deploy na [Vercel](https://vercel.com)

1. **Repositório Git** — envie o código para GitHub/GitLab/Bitbucket.
2. **Novo projeto** — em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. **Detecção** — a Vercel reconhece **Vite**; build `npm run build` e saída `dist` já estão definidos em [`vercel.json`](vercel.json).
4. **Node** — o projeto declara `engines.node` `>=20` no `package.json`; nas configurações do projeto na Vercel você pode fixar Node 20 ou 22 se quiser alinhar ao ambiente local.

### O que foi configurado

- [`vercel.json`](vercel.json) — `framework: vite`, `buildCommand`, `outputDirectory: dist`, e **rewrite** para `index.html` (útil se no futuro houver rotas no cliente, por exemplo React Router).
- [`.vercelignore`](.vercelignore) — pasta `paper/` ignorada no upload (menos bytes; o site não precisa do LaTeX em produção).

### CLI (opcional)

```bash
npx vercel        # preview
npx vercel --prod # produção
```

### Observações

- Não há backend neste repositório: deploy **estático** (`dist/`). O motor roda no navegador.
- Se mais tarde você usar `base` não raiz no Vite (subpasta), ajuste `vite.config.ts` (`base: '/subpath/'`) e as rewrites conforme a [documentação da Vercel](https://vercel.com/docs/project-configuration).
