# Compilação local do artigo (requer LaTeX: BasicTeX ou MacTeX — ver README.md).
.PHONY: pdf esqueleto clean cleanall

PDFLATEX ?= pdflatex
BIBTEX ?= bibtex

# Usa latexmk se existir; senão pdflatex + bibtex (equivalente mínimo).
pdf:
	@if command -v latexmk >/dev/null 2>&1; then \
		latexmk -pdf -interaction=nonstopmode sbpo2026.tex; \
	else \
		echo "latexmk não encontrado — a usar pdflatex + bibtex."; \
		$(PDFLATEX) -interaction=nonstopmode sbpo2026.tex; \
		$(BIBTEX) sbpo2026; \
		$(PDFLATEX) -interaction=nonstopmode sbpo2026.tex; \
		$(PDFLATEX) -interaction=nonstopmode sbpo2026.tex; \
	fi

esqueleto:
	@if command -v latexmk >/dev/null 2>&1; then \
		latexmk -pdf -interaction=nonstopmode esqueleto.tex; \
	else \
		$(PDFLATEX) -interaction=nonstopmode esqueleto.tex; \
		$(PDFLATEX) -interaction=nonstopmode esqueleto.tex; \
	fi

clean:
	@rm -f *.aux *.bbl *.blg *.log *.out *.toc *.fdb_latexmk *.fls *.synctex.gz *.nav *.snm
	@command -v latexmk >/dev/null 2>&1 && latexmk -C sbpo2026.tex 2>/dev/null || true
	@command -v latexmk >/dev/null 2>&1 && latexmk -C esqueleto.tex 2>/dev/null || true

cleanall: clean
	rm -f sbpo2026.pdf esqueleto.pdf
