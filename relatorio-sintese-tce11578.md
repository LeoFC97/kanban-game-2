# Relatório de Síntese — TCE11578

**Discente:** Leonardo Fernandes da Cunha
**Programa:** PPGEP / UFF — Mestrado Acadêmico em Engenharia de Produção
**Linha de Pesquisa:** Pesquisa Operacional *(confirmar com a Coordenação; alternativa secundária: Gestão e Trabalho — ver §B.1)*
**Orientador(a):** *[PREENCHER — Prof./Profa. orientador(a) e grupo de pesquisa associado]*
**Artefato de pesquisa:** simulador `kanban-game-2` (motor DES em TypeScript + aplicação web React/Vite) e manuscrito SBPO 2026 (`paper/sbpo2026_ptBR.pdf`).
**Data:** maio de 2026

---

## A. Introdução e Contextualização

### A.1 Tema e problema de investigação

A digitalização da economia e a transição para modos de trabalho baseados em conhecimento colocam a engenharia de software no centro da agenda de produtividade industrial. No Brasil, o setor de Tecnologia da Informação respondeu por cerca de **7% do PIB** e por movimentação superior a **R$ 700 bilhões em 2024** segundo a Associação Brasileira das Empresas de Software (BRASSCOM/ABES), com projeção de demanda agregada por **159 mil profissionais até 2025**, sustentando uma intensa pressão por melhoria de processos de desenvolvimento. Ao mesmo tempo, levantamentos recorrentes do *Standish Group* (CHAOS Report) e do *DORA State of DevOps Report* (Google Cloud, 2023-2024) seguem reportando taxas de atraso e retrabalho expressivas mesmo em organizações que adotaram práticas ágeis maduras, indicando que **o esforço, por si só, não converte capacidade nominal em vazão entregue**.

Sob a ótica da Engenharia de Produção, esta lacuna é o problema operacional clássico de **conversão de capacidade em throughput sob variabilidade e dependência interpessoal**, formalizado pela relação $L=\lambda W$ de Little (1961), pela análise de variabilidade em sistemas com WIP limitado de Hopp & Spearman (*Factory Physics*, 2008) e pelo desenho de fluxo de produto de Reinertsen (*Principles of Product Development Flow*, 2009). Aplicar este corpo de conhecimento a sistemas de trabalho cognitivo intermediados por quadros Kanban e ciclos Scrum é uma agenda ativa: Anderson, Concas, Lunesu, Marchesi & Zhang (2012, *XP*) comparam Scrum e Kanban via simulação em caso real; Cocco, Mannaro, Concas & Marchesi (2011, *XP*) contrastam Kanban, Scrum e Waterfall com dinâmica de sistemas; Lunesu, Münch, Marchesi & Mannaro (2021, *IEEE Access*) avaliam risco de desenvolvimento ágil por simulação; Petersen & Wohlin (*JSS*, 2010) sintetizam métricas lean para processos de software. No Brasil, Travassos e colaboradores na UFRJ consolidam, há mais de duas décadas, a tradição de modelagem e experimentação em engenharia de software como objeto de estudo de Engenharia de Produção.

### A.2 Lacuna (CARS — *Move 2*)

Apesar dessa base, simuladores e jogos sérios disponíveis tendem a tratar a equipe como conjunto **homogêneo** — capacidade diária estocástica por pessoa, eventualmente ajustada por especialização (papel) ou eventos narrativos. Os **efeitos par a par** que a literatura de fatores humanos em engenharia de software documenta há décadas — coordenação (Herbsleb & Mockus, *IEEE TSE*, 2003), qualidade de equipe (Hoegl & Gemuenden, *Organization Science*, 2001), segurança psicológica e confiança (Edmondson, *ASQ*, 1999; Strode, Huff, Hope & Link, *JSS*, 2012) — entram apenas como narrativa, sem ganchos quantitativos auditáveis. A consequência prática é que **não é possível, em sala de aula ou em estudo exploratório, isolar o efeito da relação entre dois colaboradores específicos sobre o tempo de ciclo do sistema**, mantendo todos os demais parâmetros fixos. Em termos de PO, falta um modelo declarativo, com semente reprodutível, em que a relação interpessoal seja um **parâmetro controlado** e não um efeito implícito.

### A.3 Proposta (CARS — *Move 3*)

A proposta de dissertação ocupa exatamente esta lacuna: **um motor de simulação a eventos discretos (DES), de tempo discreto diário, com matriz simétrica de sinergia $S=(s_{ij})$, $s_{ij}\in[-1,1]$, acoplada a três canais explícitos do fluxo Kanban-com-Scrum**: (i) multiplicador de colaboração na coluna *Dev* em cartões com múltiplos responsáveis; (ii) multiplicador de repasse entre etapas (Análise→Dev, Dev→Teste, Teste→Deploy); (iii) probabilidade de retrabalho em repasses desfavoráveis. O motor é versionado em TypeScript puro (sem dependência de *framework*), expõe `runSimulation(config)` determinístico em uma semente $\sigma$ do PRNG, e é consumido por uma aplicação web (React 19 + Vite) trilíngue (pt-BR, en, es) que serve simultaneamente como **laboratório pedagógico** e como gerador automático das figuras e tabelas do artigo SBPO 2026 associado (`npm run paper:figures`). O pacote experimental mínimo já implementado — cenários A (referência), B (colaboração positiva no par de Devs), C (atrito no repasse Analista→Líder), D (combinação) — exemplifica a análise de sensibilidade que se torna possível **só** variando $S$ sob mesmo *backlog* e mesma semente.

### A.4 Vinculação à linha de pesquisa e à ABEPRO

O projeto vincula-se primariamente à **Linha de Pesquisa em Pesquisa Operacional** do PPGEP/UFF, pela natureza metodológica do artefato — modelagem e simulação a eventos discretos, análise de sensibilidade com cenários A/B controlados, métricas de fluxo (CFD, tempo de ciclo, *throughput*) interpretadas à luz da Lei de Little e da física de fábrica. Na taxonomia da **ABEPRO**, o projeto se encaixa em três subáreas:

1. **Pesquisa Operacional** — subárea *Modelagem, Simulação e Otimização*: a contribuição central é metodológica, expressa em equações com *clamping* explícito e particionamento de pontos de história em três etapas.
2. **Educação em Engenharia de Produção** — o artefato é desenhado para uso em sala de aula como jogo sério, conversando com a tradição de von Wangenheim, Savi & Borgatto (2013, *JSS*) sobre o SCRUMIA.
3. **Engenharia do Trabalho** — em interface secundária, ao introduzir relações interpessoais como variável de decisão modelada, e não como efeito psicossocial inobservado, dialogando com o construto de *teamwork quality* (Hoegl & Gemuenden, 2001).

A divisão de pesos em três áreas é consistente com o caráter interdisciplinar valorizado pela CAPES no quadriênio em curso e fornece dois caminhos editoriais (PO/simulação e EP/educação) sem diluir o eixo metodológico.

---

## B. Alinhamento com a Linha de Pesquisa

### B.1 Aderência temática (perspectiva do orientador)

*Esta subseção deve ser personalizada pela(o) discente. A estrutura recomendada é a seguinte:*

> Os trabalhos recentes de *[ORIENTADOR(A)]* concentram-se em *[ex.: simulação a eventos discretos aplicada a sistemas de serviço / análise multicritério para apoio à decisão / modelagem de processos / otimização combinatória]*, com publicações em *[periódicos a citar — ver §C.1]*. A presente proposta amplia esse programa em **dois eixos**: (i) transporta o ferramental de DES, originalmente desenvolvido para manufatura ou serviços tradicionais, para o sistema de produção cognitiva representado pelo fluxo Kanban-Scrum de software, terreno em que o(a) orientador(a) já demonstrou interesse em *[citar trabalho específico]*; (ii) introduz uma camada de **parâmetros par a par** — a matriz de sinergia $S$ — que permite estudar acoplamentos entre estrutura de equipe e métricas de fluxo, ampliando o repertório de análises de sensibilidade tipicamente conduzidas no grupo.

A coerência argumentativa que sustenta a aderência é direta: **o método (DES com PRNG semente e *clamping* de multiplicadores) é o método do orientador; o objeto (processo de desenvolvimento de software com interferência interpessoal) é o de aplicação contemporânea com forte demanda regional, dado o adensamento de empresas de TI no eixo Rio–Niterói e a base instalada da Petrobras, Globo, Stefanini, TOTVS e startups apoiadas pela FAPERJ.**

### B.2 Integração com o corpo docente e laboratórios

A proposta articula-se com **[PREENCHER: nome do laboratório/grupo do PPGEP, ex.: LATEC, LATEP, NUMTEC, GRINS, ou grupo de Pesquisa Operacional vinculado ao Departamento de Engenharia de Produção da Escola de Engenharia da UFF]**, cujo escopo de atuação inclui simulação de sistemas, apoio à decisão e métricas de produtividade. A proposta de inserção no laboratório se dá por três frentes:

- **Projeto guarda-chuva sugerido:** *Laboratório Virtual de Sistemas de Trabalho Cognitivo* — utilizar o motor `kanban-game-2` como base computacional para um conjunto crescente de estudos sobre fluxo de conhecimento, com extensões previstas para defeitos paralelos, política de priorização e variabilidade de habilidade. O laboratório passa a oferecer um *banco vivo de modelos* de fluxo cognitivo, replicável por estudantes em diferentes disciplinas.
- **Linhas de fomento elegíveis:**
  - **FAPERJ — APQ-1, JCNE (Jovem Cientista) e Cientista do Nosso Estado**: editais regulares com aderência à temática de inovação em processos produtivos no estado do RJ. A FAPERJ tem histórico de financiar projetos em simulação aplicada a serviços.
  - **CNPq — Edital Universal e Chamada PRINT/CAPES-COFECUB** para internacionalização (parceria potencial com grupos europeus em *agile software engineering* — University of Cagliari/IT, com base nos trabalhos de Marchesi e colaboradores).
  - **FINEP — Tecnova / Inova Brasil**: financiamento para PDI em conjunto com empresa de TI parceira que utilize o motor para diagnóstico de equipes (transferência tecnológica).
  - **Empresas com PDI Lei do Bem (Lei 11.196/2005):** parcerias com Stefanini, TOTVS, Petrobras (área de TI), DASA, Globo, Itaú, Bradesco e Caixa para validação empírica em equipes reais — todas com programas ativos de PDI elegíveis à dedução fiscal.
  - **CAPES PROEX/PROAP** para o próprio programa, em rubricas de eventos e de bolsas de mestrado.
- **Possibilidade de Projeto de Extensão:** Oferta de oficinas trimestrais para coordenadores de TI e *agile coaches* da região metropolitana do RJ, usando o jogo como ferramenta de treinamento operacional, gerando dados de calibração de $S$ e bolsa de extensão para discentes de graduação em Engenharia de Produção.

### B.3 Organização metodológica

A pesquisa adota **abordagem de Design Science** (Wieringa, *Design Science Methodology for Information Systems and Software Engineering*, Springer, 2014; Dresch, Lacerda & Antunes Júnior, *Design Science Research*, 2015, edição em PT-BR), apropriada para artefatos computacionais que não apenas descrevem, mas **prescrevem** comportamento de sistema. A estrutura é convergente com as práticas da área de concentração em **Pesquisa Operacional** do programa, que privilegia modelos formalizáveis em texto acadêmico com fronteira clara entre hipótese operacional e evidência empírica.

**Procedimentos de coleta e análise de dados:**

| Fase | Procedimento | Justificativa |
|------|-------------|---------------|
| 1. Modelagem | Especificação formal do motor (equações, *clamps*, regras de avanço) e implementação em TypeScript puro com testes unitários (`vitest`); revisão sistemática da literatura via *protocolo PRISMA* limitada a Scopus e Web of Science | Garantir auditabilidade do artefato e rastreabilidade conceitual |
| 2. Verificação | Bateria de cenários de degenerescência ($S=0$, equipe singleton, *backlog* unitário) com asserções de invariantes | Verificação interna do motor (Banks et al., 2010) |
| 3. Validação face | Avaliação por especialistas (*expert review*) com profissionais de gestão ágil em 1-2 *workshops* presenciais ou remotos | Validação semântica das equações em relação à prática |
| 4. Análise de sensibilidade | Pacote A/B/C/D já implementado + extensão Monte Carlo com $n\geq 1000$ replicações por cenário, *boxplots* de tempo de ciclo e *throughput*, ANOVA não-paramétrica (Kruskal-Wallis) entre cenários | Quantificar efeito de $S$ controlando demais parâmetros |
| 5. Triangulação metodológica | Estudo de caso instrumental opcional com calibração de $\beta$ e $\gamma$ a partir de dados de CFD reais (ex.: Jira/GitHub) de uma equipe parceira; comparação ajuste-simulação | Triangulação artefato + dado de campo + percepção do especialista |
| 6. Aplicação pedagógica | Quase-experimento com turma da disciplina de graduação ou MBA, pré- e pós-teste de aprendizagem de conceitos de PO (*throughput*, WIP, Little) | Avaliar efetividade educacional do artefato |

A **triangulação metodológica** (Yin, 2018) opera com: (a) dados sintéticos gerados pelo motor; (b) dados observacionais de fluxo de uma equipe parceira; (c) dados perceptuais de avaliação por especialistas. Esta combinação responde aos critérios de validade interna, externa e de construção exigidos para uma dissertação em Engenharia III.

### B.4 Grau de inovação

A diferenciação da proposta em relação aos trabalhos recentes pode ser sumarizada na seguinte tabela analítica (versão estendida da Tabela 1 do manuscrito SBPO 2026):

| Trabalho/ferramenta | Sinergia par a par modelada | Reprodutibilidade (semente + código) | Pacote experimental A/B | Aplicação web aberta + figuras geradas pelo motor |
|---|---|---|---|---|
| Cocco et al. (2011) — System Dynamics XP/Kanban | Não (variável agregada) | Parcial | Não | Não |
| Anderson et al. (2012) — Comparativo Scrum/Kanban | Não | Parcial | Sim (limitado) | Não |
| von Wangenheim et al. (2013) — SCRUMIA | Não (jogo de tabuleiro) | N/A | Não | Não |
| Lunesu et al. (2021) — Risco ágil | Não | Parcial | Parcial | Não |
| *getKanban* e *Kanban Simulator* (comerciais) | Não | Não | Não | Não |
| **Esta proposta** | **Sim ($s_{ij}\in[-1,1]$)** | **Sim (semente $\sigma$ + repositório OSS)** | **Sim (A/B/C/D explícitos)** | **Sim (`npm run paper:figures`)** |

A inovação se manifesta em **quatro dimensões**:

1. **Metodológica** — primeiro motor DES, no recorte de literatura mapeado, em que a matriz simétrica de relação interpessoal é parâmetro de primeira classe com *clamping* documentado, e não efeito narrativo.
2. **De aplicação** — recombina três tradições de PO (DES, físicas de fluxo, fatores humanos) em um único artefato pedagogicamente operável, fechando lacuna apontada por Kellner et al. (1999) para *software process simulation modeling*.
3. **De contexto** — produzido por programa brasileiro com vocação de inserção regional, com licença aberta e textos em três idiomas (pt-BR/en/es), maximizando potencial de adoção em América Latina.
4. **De fonte de dados** — o artefato gera **as próprias figuras e tabelas do artigo** a partir do código (script `npm run paper:figures`), eliminando a deriva texto-implementação criticada por Sandve et al. (*PLOS Comp. Biol.*, 2013) e Wilson et al. (*PLOS Comp. Biol.*, 2017) em pesquisa computacional.

A **contribuição para acadêmicos** é dispor de um *benchmark* aberto e auditável para discussão de variabilidade interpessoal em sistemas de trabalho cognitivo; a **contribuição para profissionais** é a possibilidade de instrumentalizar retrospectivas Scrum com simulação contrafactual ("o que aconteceria com o nosso tempo de ciclo se a sinergia entre A e B subisse de $-0{,}3$ para $+0{,}2$?"), gerando um *artefato decisório* utilizável por *agile coaches* e gerentes de TI.

### B.5 Compromisso com a ética na pesquisa

**Ferramentas e softwares utilizados na pesquisa:**

| Ferramenta | Uso | Justificativa |
|------------|-----|---------------|
| **TypeScript 6**, **Node 20**, **React 19**, **Vite 8** | Implementação do motor e da aplicação web | Tipagem estática garante auditabilidade; React/Vite são padrão de mercado e facilitam reprodutibilidade |
| **Vitest** | Testes unitários do motor | Cobertura de invariantes do modelo |
| **LaTeX (pdflatex/latexmk, TeX Live)** com **pgfplots/TikZ** | Manuscrito e figuras vetoriais | Reprodutibilidade tipográfica e científica |
| **Recharts** | Visualizações na aplicação web | Compatibilidade com React |
| **i18next** | Internacionalização trilíngue | Maximiza alcance pedagógico em PT-BR/EN/ES |
| **Git/GitHub** | Versionamento e *release* com identificador de commit | Aderência às Boas Práticas em Computação Científica (Wilson et al., 2017) |
| **Claude Code (Anthropic)** e **ChatGPT (OpenAI)** | Assistência de pareamento na implementação, revisão de literatura, e revisão de redação técnica | Uso declarado conforme diretrizes emergentes da CAPES e da ABNT/IEEE para IA em produção acadêmica; todo *output* é revisado pelo discente e a autoria intelectual permanece humana |
| **GitHub Copilot** | Autocompletar de código rotineiro | Idem; restrito a trechos onde o discente já formulou a intenção |

**Submissão ao Comitê de Ética em Pesquisa (CEP):**

A **versão atual** da pesquisa **não envolve sujeitos humanos**: o objeto é o artefato computacional e os dados são integralmente sintéticos (gerados pelo motor a partir de configuração paramétrica). Portanto, a submissão ao CEP **não é obrigatória** nesta etapa, conforme a Resolução CNS 510/2016 (que dispensa pesquisas com dados de domínio público) e a Resolução CNS 466/2012.

A submissão **passa a ser necessária** caso a fase 5 (triangulação com equipe real) ou a fase 6 (quase-experimento pedagógico) sejam executadas, pois envolverão coleta de percepções de profissionais ou de estudantes (instrumento de medida de aprendizagem). Nesse cenário, o protocolo será submetido pela **Plataforma Brasil** ao CEP institucional da UFF, contemplando TCLE (Termo de Consentimento Livre e Esclarecido), garantia de anonimização e descarte controlado dos dados. Esse marco está identificado no cronograma da §C.2.

---

## C. Contribuição para os Indicadores de Avaliação

A análise a seguir tem como referência o **Documento de Área — Engenharia III (CAPES)**, mais recente disponível, que orienta a avaliação quadrienal de programas de pós-graduação em Engenharia de Produção, juntamente com o **Qualis-Periódicos** vigente.

### C.1 Produção Intelectual

**Estratégia editorial em camadas (mínimo 2 periódicos + 2 congressos):**

| Manuscrito previsto | Periódico-alvo principal | Periódico-alvo alternativo | Qualis Eng. III (referência) | Justificativa de aderência |
|---|---|---|---|---|
| **Artigo 1 (metodológico)** — Apresentação do motor, da matriz $S$, do *clamping* e do pacote A/B/D | **Simulation Modelling Practice and Theory** (Elsevier) | **Journal of Simulation** (Taylor & Francis / OR Society) | **A1 / A2** | Escopo direto em DES e *simulation experiments*; histórico recente de artigos sobre simulação de processos de software (Lunesu et al., 2021, *IEEE Access*, com vizinhança temática) |
| **Artigo 2 (aplicação e validação)** — Calibração com dados de fluxo de equipe parceira; análise de sensibilidade Monte Carlo; discussão de viés/variância | **Computers & Industrial Engineering** (Elsevier) | **International Journal of Production Research** (Taylor & Francis) | **A1** | Tradição de aceite de artigos com modelagem DES e métricas de fluxo industrial em setores não-manufatureiros; escopo CIE inclui sistemas de serviço |
| **Artigo 3 (pedagógico, opcional)** — Quase-experimento educacional com o artefato e impacto em aprendizagem de conceitos de PO | **Production** (revista ABEPRO) | **Gestão & Produção** (UFSCar) ou **Pesquisa Operacional** (SOBRAPO) | **A2 / B1** | *Production* é o veículo brasileiro de referência para EP; *Pesquisa Operacional* recebe trabalhos em educação em PO; *Gestão & Produção* aceita educação em EP |

**Análise de coerência com escopo dos periódicos-alvo** (justificativa em prosa):

- **Simulation Modelling Practice and Theory** vem publicando, no período 2022-2025, artigos sobre DES aplicada a sistemas de serviço, *digital twins* e processos de conhecimento, com forte demanda por reprodutibilidade computacional explícita — *fit* alto com a contribuição metodológica do artefato.
- **Computers & Industrial Engineering** mantém *track record* de simulação e análise de sensibilidade em sistemas de produção e serviços, com aceitação de modelos que articulem fatores humanos em estruturas formalizadas — *fit* alto para o segundo artigo, calibrado com dados.
- **Production** (ABEPRO), além de Qualis A2 estável, tem audiência brasileira amplificada, ajudando o programa do PPGEP/UFF a fortalecer indicadores de Inserção Social e de Visibilidade no quadriênio.

**Participação em congressos (estratégia):**

| Congresso | Data prevista | Status | Função estratégica |
|---|---|---|---|
| **SBPO 2026 (Simpósio Brasileiro de Pesquisa Operacional)** | nov/2026 | **submetido** (manuscrito em `paper/sbpo2026_ptBR.pdf`) | Apresentação preliminar do motor; tese exposta à comunidade SOBRAPO; *feedback* para o Artigo 1 |
| **ENEGEP 2026 (Encontro Nacional de Engenharia de Produção)** | out/2026 | **planejado** | Maior congresso de EP do Brasil; inserção do trabalho na comunidade ABEPRO; impacto em indicador de Inserção Social |
| **SIMPEP 2027 (Simpósio de Engenharia de Produção, UNESP-Bauru)** | nov/2027 | planejado | Recepção tipicamente forte para temas de simulação aplicada |
| **Winter Simulation Conference (WSC) 2027** | dez/2027 | **stretch goal** se houver bolsa de viagem (PROEX/PROAP ou empresa parceira) | Conferência internacional A1 em simulação; maximiza Internacionalização (indicador CAPES) |
| **POMS-Brasil 2027** | mai/2027 | planejado | Tradição em PO aplicada a serviços |

**Meta de Produção Intelectual ao final do mestrado:** 1 artigo A1 ou A2 submetido (Artigo 1), 1 artigo SBPO publicado, 1 artigo ENEGEP publicado, 1 artigo em revista nacional (Artigo 3) submetido ou aceito. Este perfil **excede** o mínimo regimental e contribui materialmente para o **Estrato A** da produção do PPGEP/UFF.

### C.2 Formação de Pessoal

**Impacto no Tempo Médio de Titulação:** O regime do mestrado acadêmico no PPGEP/UFF prevê **defesa em até 24 meses** (com possibilidade de prorrogação justificada). Cumprir o prazo regulamentar é o **indicador mais influente** de Formação no Documento de Área Eng. III, junto à Produção Intelectual. O cronograma abaixo é organizado para **garantir defesa dentro de 24 meses**, com qualificação aos **15 meses** (antecipando-se ao limite de 18 meses do regimento), e folga de redação de 3 meses.

**Cronograma semestral detalhado** *(ajustar os meses ao semestre real de ingresso da(o) discente — esta versão assume ingresso em 2025/2)*:

| Semestre | Disciplinas (créditos) | Pesquisa | Produção | Marcos |
|---|---|---|---|---|
| **1º — 2025/2** | 3 disciplinas obrigatórias da linha de PO: *Métodos de Pesquisa em Eng. de Produção*, *Simulação a Eventos Discretos*, *Estatística para Engenharia* | Revisão sistemática de literatura (PRISMA); especificação formal v0 do motor; protótipo funcional | — | Plano de pesquisa aprovado (mês 3) |
| **2º — 2026/1** | 2 eletivas: *Pesquisa Operacional Avançada*, *Tópicos em Modelagem de Sistemas Produtivos* | Implementação completa do motor; cenários A/B/C/D; testes unitários; redação do manuscrito SBPO | **Submissão SBPO 2026** (concluída); início do **Artigo 1** | Disciplinas concluídas (mês 12) |
| **3º — 2026/2** | Apenas atividades de pesquisa orientada (créditos) | Aplicação Monte Carlo; calibração com dados sintéticos; redação Artigo 1 | **Apresentação ENEGEP 2026** ; **submissão do Artigo 1** ao periódico A1/A2 | **Qualificação** (mês 15) |
| **4º — 2027/1** | Atividade orientada / Estágio docência (opcional, oferta de mini-curso baseado no artefato) | Revisão pós-*peer-review* Artigo 1; opcional: estudo de caso com equipe parceira (sujeito ao CEP) | Início do **Artigo 2**; submissão do **Artigo 3** (educacional) à *Production* | Dissertação versão preliminar (mês 21) |
| **5º — 2027/2 (até mês 24)** | — | Revisão final da dissertação | Submissão do **Artigo 2**; eventual *revise & resubmit* do Artigo 1 | **Defesa** (mês 24) |

Disciplinas e número de créditos serão ajustados ao Regimento vigente do PPGEP/UFF; o cronograma já reserva 20% de margem de risco para revisões editoriais e eventos de fluxo (CEP, dados de parceira). A política recomendada de **publicação contínua** (escrever junto com pesquisar) está embutida nas linhas "Produção" do cronograma e responde ao critério de Tempo Médio de Titulação **sem sacrificar Estrato A**.

### C.3 Impacto e Inserção Social

**Pertinência do problema real:** O artefato resolve dois problemas práticos:

1. *Para organizações públicas e privadas com equipes de software:* uma **ferramenta de simulação contrafactual de retrospectiva**, gratuita e auditável, que substitui discussões opinativas ("acho que demos passos atrás esta sprint") por experimentos numéricos com o próprio histórico do time. Há demanda direta de empresas como Petrobras, Bradesco, Caixa, Globo, Stefanini, TOTVS, Movile, Nubank, e do próprio governo digital (Dataprev, Serpro), todas com áreas de Engenharia de Produtividade.
2. *Para o ensino brasileiro de Engenharia de Produção e Engenharia de Software:* um **laboratório aberto** que reduz o custo de equipar disciplinas de PO e processos ágeis com material experimental reprodutível, alinhando-se à tradição do SCRUMIA (von Wangenheim et al., 2013, UFSC), mas com motor declarativo e versionado.

**Potencial de transferência tecnológica:**

- **Registro de Programa de Computador (RPC) no INPI** — submissão prevista após estabilização da v1.0; baixo custo, alto valor sinalizador para indicador de Inserção Social/Impacto na Sociedade.
- **Possível patente:** a lógica de inferência de matriz $S$ a partir de eventos de fluxo (com triangulação CFD + percepção da equipe) é candidata a depósito como patente de processo (BR), em parceria com a NIT-UFF (Agência de Inovação).
- **Licenciamento de versão *enterprise*** com módulos de exportação para Jira/Azure DevOps via uma *spin-off* ou parceria com integradora — caminho FINEP Tecnova / Lei do Bem.

**Proposta de aplicativo (mesmo que simples):**

Para amplificar o impacto, proponho um **aplicativo *companion* web/mobile** denominado *"RetroSync"* (nome de trabalho), que opera como elicitação contínua e leve da matriz de sinergia $S$:

- **Frente A — coleta:** ao fim de cada *daily* ou *retro*, cada membro recebe push notification com pergunta única, do tipo *"Quão fluida foi a colaboração com [Nome] hoje?"* em escala Likert ($-2$ a $+2$). Coleta anônima a pares (não revela respondente individual ao outro).
- **Frente B — ajuste do modelo:** o app atualiza, via média móvel exponencial com decaimento, uma estimativa $\hat{S}(t)$ por par, sob *clipping* em $[-1,1]$.
- **Frente C — simulação contrafactual:** o coach/gerente vê, em painel, a projeção do próximo sprint sob $\hat{S}$ atual versus $\hat{S}$ contrafactual (ex.: "se Bruno e Ana subissem para $+0{,}5$, ciclo médio cairia de 12 para 9 dias com 95% de IC simulada"), gerando agenda de coaching baseada em **decisão modelada**.
- **MVP técnico:** o motor já está pronto (TypeScript, sem *backend*); o MVP do app exige apenas (i) coleta paginada (Supabase ou Firebase), (ii) tela de elicitação (React Native ou PWA), (iii) painel — viável em **3-4 meses de trabalho discente extra**, candidato a financiamento JCNE/FAPERJ ou parceria com integradora.

Este aplicativo materializa o ciclo *modelo → decisão → ação → re-medição* característico da Pesquisa Operacional aplicada e fornece **evidência tangível** de transferência tecnológica para a próxima avaliação CAPES.

**Acesso aberto e licenciamento:** todo o motor e a aplicação web já estão em repositório público sob licença permissiva (MIT/Apache 2.0 a definir), figurando em *Software Heritage* e citáveis com DOI via Zenodo após o primeiro *release*. Esta política multiplica o indicador de Visibilidade.

---

## D. Considerações Finais

Este relatório articula como a proposta de dissertação `kanban-game-2` se alinha estrategicamente ao PPGEP/UFF em quatro planos:

1. **Linha de Pesquisa em Pesquisa Operacional** — através de modelagem e simulação a eventos discretos formalizada, com análise de sensibilidade explícita e reprodutibilidade verificável por *commit*.
2. **Identidade institucional** — a temática se beneficia da posição da Escola de Engenharia da UFF no eixo metropolitano do RJ, com proximidade a empresas de TI e a centros de PDI de grandes corporações, viabilizando triangulação metodológica e captação de fomento (FAPERJ, FINEP, Lei do Bem).
3. **Indicadores CAPES (Documento de Área Engenharia III)** — com uma estratégia editorial em três camadas (1 A1/A2 internacional + 1 A1 internacional + 1 A2 nacional), participação ativa em SBPO/ENEGEP/SIMPEP, e cronograma com defesa em 24 meses, o projeto contribui simultaneamente para Produção Intelectual (Estrato A) e Tempo Médio de Titulação.
4. **Impacto na Sociedade** — via registro de programa no INPI, licenciamento aberto, oficinas de extensão e o aplicativo *RetroSync* como instrumento de transferência tecnológica, gerando "produtos" auditáveis para o relato quadrienal CAPES.

A condução do trabalho observa os **requisitos mínimos de produção acadêmica discente** previstos no Regimento e na Resolução do PPGEP/UFF *[citar resolução específica — confirmar com a Coordenação]*, com a meta de **superá-los** em volume e em estrato; e segue as **práticas éticas de pesquisa** vigentes: (i) declaração transparente do uso de ferramentas de IA assistiva (Claude Code, ChatGPT, Copilot) com revisão crítica humana e autoria intelectual preservada, conforme orientações em construção da CAPES e da ABNT; (ii) ausência atual de sujeitos humanos com plano explícito de submissão ao CEP (Plataforma Brasil) caso a fase de calibração empírica seja ativada; (iii) acesso aberto a código, dados sintéticos e LaTeX, alinhando-se às práticas de pesquisa computacional reprodutível (Sandve et al., 2013; Wilson et al., 2017).

Em síntese, o discente assume o compromisso de **executar a pesquisa com excelência acadêmica e com clareza dos mecanismos de avaliação**, entregando ao PPGEP/UFF um artefato de software auditável, manuscritos em veículos de alto impacto, e canais de inserção social mensuráveis, contribuindo para a manutenção e elevação da nota do programa na próxima avaliação quadrienal CAPES.

---

## Referências

*(Lista mínima — completar conforme o veículo final do relatório; o manuscrito SBPO 2026 anexo ao repositório contém bibliografia complementar em `paper/bibliografia.bib`.)*

- ANDERSON, D. J. *Kanban: Successful Evolutionary Change for Your Technology Business.* Blue Hole Press, 2010.
- ANDERSON, D. J.; CONCAS, G.; LUNESU, M. I.; MARCHESI, M.; ZHANG, H. A Comparative Study of Scrum and Kanban Approaches on a Real Case Study Using Simulation. In: *Agile Processes in Software Engineering and Extreme Programming (XP 2012)*, LNBIP, v. 111, p. 123-137. Springer, 2012.
- ABEPRO. *Áreas e subáreas da Engenharia de Produção.* Associação Brasileira de Engenharia de Produção. Disponível em: <https://www.abepro.org.br>.
- BRASSCOM. *Relatório Setorial de TIC 2024.* Associação Brasileira das Empresas de Tecnologia da Informação e Comunicação, 2024.
- CAPES. *Documento de Área 2019 — Engenharias III.* Coordenação de Aperfeiçoamento de Pessoal de Nível Superior. *(verificar Documento de Área mais recente disponível à data do relatório.)*
- COCCO, L.; MANNARO, K.; CONCAS, G.; MARCHESI, M. Simulating Kanban and Scrum vs. Waterfall with System Dynamics. In: *Agile Processes in Software Engineering and Extreme Programming (XP 2011)*, LNBIP. Springer, 2011.
- DRESCH, A.; LACERDA, D. P.; ANTUNES JÚNIOR, J. A. V. *Design Science Research: Método de Pesquisa para Avanço da Ciência e Tecnologia.* Bookman, 2015.
- EDMONDSON, A. Psychological Safety and Learning Behavior in Work Teams. *Administrative Science Quarterly*, v. 44, n. 2, p. 350-383, 1999.
- HERBSLEB, J. D.; MOCKUS, A. An Empirical Study of Speed and Communication in Globally Distributed Software Development. *IEEE TSE*, v. 29, n. 6, p. 481-494, 2003.
- HOEGL, M.; GEMUENDEN, H. G. Teamwork Quality and the Success of Innovative Projects. *Organization Science*, v. 12, n. 4, p. 435-449, 2001.
- HOPP, W. J.; SPEARMAN, M. L. *Factory Physics.* 3. ed. Waveland Press, 2008.
- KELLNER, M. I.; MADACHY, R. J.; RAFFO, D. M. Software process simulation modeling: Why? What? How? *Journal of Systems and Software*, v. 46, n. 2-3, p. 91-105, 1999.
- LITTLE, J. D. C. A Proof for the Queuing Formula: $L=\lambda W$. *Operations Research*, v. 9, n. 3, p. 383-387, 1961.
- LUNESU, M. I.; MÜNCH, J.; MARCHESI, M.; MANNARO, K. Assessing the risk of software development in agile methodologies using simulation. *IEEE Access*, 2021.
- MADACHY, R. J. *Software Process Dynamics.* Wiley-IEEE Press, 2008.
- POPPENDIECK, M.; POPPENDIECK, T. *Lean Software Development: An Agile Toolkit.* Addison-Wesley, 2003.
- REINERTSEN, D. G. *The Principles of Product Development Flow.* Celeritas, 2009.
- SANDVE, G. K. et al. Ten Simple Rules for Reproducible Computational Research. *PLOS Comput. Biol.*, v. 9, n. 10, e1003285, 2013.
- SCHWABER, K.; SUTHERLAND, J. *The Scrum Guide.* Scrum.org, 2020.
- STRODE, D. E.; HUFF, S. L.; HOPE, B.; LINK, S. Coordination in co-located agile software development projects. *Journal of Systems and Software*, v. 85, n. 6, p. 1222-1238, 2012.
- VON WANGENHEIM, C. G.; SAVI, R.; BORGATTO, A. F. SCRUMIA — An Educational Game for Teaching SCRUM in Computing Courses. *Journal of Systems and Software*, v. 86, n. 10, p. 2675-2687, 2013.
- WIERINGA, R. J. *Design Science Methodology for Information Systems and Software Engineering.* Springer, 2014.
- WILSON, G. et al. Good Enough Practices in Scientific Computing. *PLOS Comput. Biol.*, v. 13, n. 6, e1005510, 2017.
- YIN, R. K. *Case Study Research and Applications.* 6. ed. Sage, 2018.

---

### Apêndice — *Placeholders* a personalizar antes da entrega

1. **Orientador(a) e perspectiva temática** — §B.1, com referência a 2-3 publicações recentes do(a) orientador(a).
2. **Laboratório/grupo do PPGEP** — §B.2, nome exato e linha de ação.
3. **Linha de Pesquisa formal de matrícula** — capa e §A.4.
4. **Datas exatas do cronograma** — §C.2, alinhar ao semestre real de ingresso.
5. **Resolução interna do PPGEP** — §D, citação precisa do número e ano.
6. **Documento de Área CAPES Engenharia III** — §C.1 e §D, confirmar a versão mais recente publicada à data do relatório.
