# Artigo SBPO 2026 (ST) — rascunho no repositório

Este diretório contém um **rascunho LaTeX** dimensionado conforme as regras públicas do SBPO 2026 (margens, Times 11, coluna única). O template **oficial** (DOCX/LaTeX) deve ser obtido no site do evento: [Informações gerais | SBPO 2026](https://eventos.galoa.com.br/sbpo-2026/page/7689-informacoes-gerais).

## Configurar LaTeX no macOS (compilar localmente)

### 1. Instalar distribuição (escolha uma)

**Opção A — BasicTeX (recomendado: ~100 MB + pacotes sob demanda)**

```bash
brew install --cask basictex
```

O instalador macOS pede **palavra-passe de administrador**. Depois, **feche e reabra o terminal** (ou rode `eval "$(/usr/libexec/path_helper)"`) para passar a ver `pdflatex` em `/Library/TeX/texbin`.

**Opção B — MacTeX completo (~4 GB, raramente faltam pacotes)**

```bash
brew install --cask mactex-no-gui
```

### 2. Pacotes extra para este artigo

O `sbpo2026.tex` usa `babel` (português), `pgfplots`/`tikz`, `mathptmx`, `booktabs`, etc. Com **BasicTeX**, instale o conjunto mínimo:

```bash
cd paper
chmod +x setup-texlive-packages.sh
./setup-texlive-packages.sh
```

O script corre **`tlmgr update --self`** primeiro (exigência recente do TeX Live) e define **`verify-downloads 0`** quando não há GPG do `tlmgr` configurado — situação típica após BasicTeX, e evita falhas com espelhos BR.

Se o `tlmgr` ainda terminar com erro, tente manualmente:

```bash
sudo tlmgr option repository https://mirror.ctan.org/systems/texlive/tlnet
sudo tlmgr option verify-downloads 0
sudo tlmgr update --self
sudo tlmgr install latexmk pgfplots babel-portuguese hyphen-portuguese booktabs psnfss microtype enumitem collection-fontsrecommended
```

Se a compilação ainda reclamar de um ficheiro `.sty` em falta, instale o pacote correspondente, por exemplo: `sudo tlmgr install <nome-do-pacote>` (o log do `pdflatex` indica o nome).

### 3. Compilar

```bash
cd paper
make pdf
```

O `Makefile` usa **`latexmk`** se estiver instalado; caso contrário corre **`pdflatex` + `bibtex` + `pdflatex` ×2** (não precisa de `latexmk` para gerar o PDF). O PDF fica em `paper/sbpo2026.pdf`.

Para só o esqueleto: `make esqueleto`.

## Limite de 12 páginas (submissão)

O edital do SBPO 2026 (ST) impõe **no máximo 12 páginas** no PDF (conteúdo, figuras, tabelas e referências — confirme no edital se anexos entram na conta).

- Em **`sbpo2026.tex`** está ativado `\sbpoLimitPagestrue`: ao compilar, se o documento passar de **12** páginas, aparece um **`\PackageWarning`** no ficheiro `.log` (procure por `sbpo2026`).
- O limite numérico está em `\sbpoMaxPages` no ficheiro `preamble_sbpo.tex` (ajuste só se o edital mudar).
- O **`esqueleto.tex`** mantém `\sbpoLimitPagesfalse` para não gerar avisos enquanto o rascunho com sumário excede 12 páginas.

Para caber em 12 páginas: encurtar subsecções longas (sobretudo modelo e resultados), reduzir número/tamanho de figuras TikZ, usar tabelas mais compactas (`booktabs` + colunas `p{}` estreitas) e bibliografia enxuta.

## Esqueleto para redação

O ficheiro `esqueleto.tex` compila um **esboço com TOC** e secções/subsecções vazias (placeholders `\textit{[...]}`) alinhadas ao `sbpo2026.tex`. Use-o para escrever o texto antes de colar no rascunho principal ou no template oficial.

```bash
cd paper
latexmk -pdf -interaction=nonstopmode esqueleto.tex
```

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
