#!/usr/bin/env bash
# Instala pacotes TeX Live usados por sbpo2026.tex (além do núcleo mínimo do BasicTeX).
# Executar DEPOIS de instalar BasicTeX e reiniciar o terminal (ou path_helper).
set -euo pipefail

export PATH="/Library/TeX/texbin:${PATH}"

if ! command -v tlmgr >/dev/null 2>&1; then
  echo "tlmgr não encontrado. Adicione ao PATH, por exemplo:"
  echo "  export PATH=\"/Library/TeX/texbin:\$PATH\""
  echo "  eval \"\$(/usr/libexec/path_helper)\""
  exit 1
fi

echo "A configurar repositório e atualizar o próprio tlmgr (obrigatório antes de instalar)..."
# Mirror principal (evita avisos de espelhos não verificados em alguns BR)
sudo tlmgr option repository https://mirror.ctan.org/systems/texlive/tlnet
# BasicTeX muitas vezes não tem GPG do TeX Live configurado — sem isto, o tlmgr pode falhar.
sudo tlmgr option verify-downloads 0
sudo tlmgr update --self

echo "A instalar pacotes do artigo (pode pedir a palavra-passe de administrador)..."
sudo tlmgr install \
  latexmk \
  collection-fontsrecommended \
  pgfplots \
  babel-portuguese \
  hyphen-portuguese \
  microtype \
  enumitem \
  booktabs \
  psnfss

echo "Feito. Teste com: cd paper && make pdf"
