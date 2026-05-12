#!/usr/bin/env bash
# Gera ../paper-overleaf-ptBR.zip só com ficheiros necessários ao manuscrito pt-BR (Overleaf).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
PKG="$STAGE/sbpo-paper-ptBR"
mkdir -p "$PKG/sections" "$PKG/data"

cp "$REPO_ROOT/paper/preamble_sbpo.tex" "$PKG/"
cp "$REPO_ROOT/paper/sbpo2026_body.tex" "$PKG/"
cp "$REPO_ROOT/paper/bibliografia.bib" "$PKG/"
cp "$REPO_ROOT/paper/overleaf-ptBR/main.tex" "$PKG/"
[[ -f "$REPO_ROOT/paper/overleaf-ptBR/OVERLEAF.txt" ]] && cp "$REPO_ROOT/paper/overleaf-ptBR/OVERLEAF.txt" "$PKG/"

for name in resumo introducao relacionados modelo ritos arquitetura experimentos resultados discussao conclusao; do
  cp "$REPO_ROOT/paper/sections/${name}.tex" "$PKG/sections/"
done

cp "$REPO_ROOT/paper/data/"* "$PKG/data/"

OUT_ZIP="$REPO_ROOT/paper-overleaf-ptBR.zip"
rm -f "$OUT_ZIP"
# Raiz do ZIP = raiz do projeto Overleaf (main.tex no topo, sem pasta extra).
( cd "$PKG" && zip -r -q "$OUT_ZIP" . )
rm -rf "$STAGE"
echo "Created $OUT_ZIP"
