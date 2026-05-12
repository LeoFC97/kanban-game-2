# Local paper build (LaTeX: BasicTeX or MacTeX — see paper/README.md).
.PHONY: pdf pdf-pt pdf-en pdf-all esqueleto clean cleanall

PDFLATEX ?= pdflatex
BIBTEX ?= bibtex

# Uses latexmk if present; otherwise pdflatex + bibtex (minimal equivalent).
define RUN_LATEX
	@if command -v latexmk >/dev/null 2>&1; then \
		latexmk -pdf -interaction=nonstopmode $(1); \
	else \
		echo "latexmk not found — using pdflatex + bibtex for $(1)."; \
		$(PDFLATEX) -interaction=nonstopmode $(1); \
		$(BIBTEX) $(basename $(1)); \
		$(PDFLATEX) -interaction=nonstopmode $(1); \
		$(PDFLATEX) -interaction=nonstopmode $(1); \
	fi
endef

# Manuscrito em pt-BR → `paper/sbpo2026.pdf` (driver legado; mesmo conteúdo que pdf-pt)
pdf:
	$(call RUN_LATEX,sbpo2026.tex)

# pt-BR explícito → `paper/sbpo2026_ptBR.pdf`
pdf-pt:
	$(call RUN_LATEX,sbpo2026_ptBR.tex)

# en-US → `paper/sbpo2026_enUS.pdf`
pdf-en:
	$(call RUN_LATEX,sbpo2026_enUS.tex)

# Ambos os idiomas (pt-BR + en-US)
pdf-all: pdf-pt pdf-en

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
	@command -v latexmk >/dev/null 2>&1 && latexmk -C sbpo2026_ptBR.tex 2>/dev/null || true
	@command -v latexmk >/dev/null 2>&1 && latexmk -C sbpo2026_enUS.tex 2>/dev/null || true
	@command -v latexmk >/dev/null 2>&1 && latexmk -C esqueleto.tex 2>/dev/null || true

cleanall: clean
	rm -f sbpo2026.pdf sbpo2026_ptBR.pdf sbpo2026_enUS.pdf esqueleto.pdf
