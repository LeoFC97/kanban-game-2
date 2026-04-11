# Artigo SBPO 2026 (ST) — rascunho no repositório

Este diretório contém um **rascunho LaTeX** dimensionado conforme as regras públicas do SBPO 2026 (até 12 páginas, margens, Times 11, coluna única). O template **oficial** (DOCX/LaTeX) deve ser obtido no site do evento: [Informações gerais | SBPO 2026](https://eventos.galoa.com.br/sbpo-2026/page/7689-informacoes-gerais).

## Compilar

Na raiz do repositório (com LaTeX instalado, ex.: MacTeX/TeX Live):

```bash
cd paper
latexmk -pdf -interaction=nonstopmode sbpo2026.tex
```

Ou:

```bash
cd paper
pdflatex sbpo2026.tex
bibtex sbpo2026
pdflatex sbpo2026.tex
pdflatex sbpo2026.tex
```

## Figuras (regenerar a partir do motor)

```bash
npm run paper:figures
```

Isso atualiza `paper/figures/*.svg`, os trechos TikZ em `paper/data/*.tex` (quando aplicável) e `paper/data/experiment-summary.json`, a partir de `src/simulation/`.

## Submissão anônima

A primeira versão para avaliação **não** deve conter nomes ou filiações; use apenas título, resumo e palavras-chave na primeira página, conforme o edital.
