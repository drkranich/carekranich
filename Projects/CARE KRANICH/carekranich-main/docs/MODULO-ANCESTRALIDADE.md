# Módulo Interativo de Genealogia e Ancestralidade — "Minhas Origens"

> Diretriz do fundador (01/08/2026) + plano de execução. Nome oficial do módulo: **Minhas Origens — Atlas Ancestral Care Kranich**.
> A experiência não é um dashboard: é um atlas pessoal que une ciência, emoção, história, geografia e família.
> Complemento obrigatório: **Estúdio de Resultados Ancestrais** — CMS visual com CRUD completo, sem necessidade de programadores.

## 1. Arquitetura do módulo

Três camadas, uma base de dados:

1. **Camada de dados validados** (pipeline genético → resultado técnico → versão publicada). O módulo visual **nunca inventa percentuais**: consome o que foi inserido/validado no Estúdio.
2. **Camada editorial (Estúdio)** — `/app/ancestry-studio`: construtor guiado em 7 etapas, CRUD completo, versões, aprovação, auditoria, templates, edição inline, drag and drop, editor de mapa e editor de animação sem código.
3. **Camada de experiência (paciente)** — `/app/origins` e `/origens/{token}` (compartilhável): revelação animada, mapa interativo, gráficos, painéis territoriais, linha do tempo, rotas, comparação familiar, árvore, PDF premium.

Componentes reutilizáveis: `OriginsReveal` (abertura), `AncestryMap` (SVG/canvas com pontos pulsantes e heat), `AncestryChart` (círculo/barras/constelação/camadas familiares), `RegionPanel`, `AncestryTimeline`, `MigrationRoutes`, `JourneyPlayer`, `FamilyTree`, `A11ySettings`.

## 2. Jornada do usuário

**Paciente**: notificação de liberação → tela de preparação (fundo profundo, partículas, "Seu DNA guarda caminhos percorridos por muitas gerações") → botão "Descobrir minhas origens" → hélice de DNA formada por pontos luminosos, girando sutilmente → hélice se desfaz em partículas que formam o mapa-múndi → regiões pulsam com intensidade proporcional ao percentual → dashboard vivo (mapa + composição) → exploração por continente/região/país → painel territorial com texto histórico e linha do tempo → rotas migratórias → modo jornada narrada → comparação familiar → árvore → compartilhar / PDF.

**Equipe do laboratório**: seleciona paciente → seleciona exame/versão/algoritmo → insere origens (hierarquia completa) → validação automática de percentuais → configura animação por controles visuais → pré-visualiza em desktop/tablet/celular/PDF/acessível → envia para revisão → aprovação científica e médica → publica (imediato ou agendado) → notificações automáticas.

## 3. Wireframes (descrição)

- **Reveal**: tela cheia escura, texto centralizado, botão pill; sem chrome de app.
- **Origens (paciente)**: topo com nome e versão do resultado; mapa ocupando 60% (desktop) com camadas (origem atual, regiões ancestrais, rotas, linha do tempo, família, correspondências); painel direito com gráfico alternável em 4 modos; barra inferior com controles da jornada; clique em região abre painel lateral imersivo.
- **Mobile**: mapa em tela cheia, cartões deslizáveis por região, gráfico abaixo, painel em modal, linha do tempo horizontal, botão flutuante "Assistir à minha jornada".
- **Estúdio (lista)**: tabela avançada com colunas (paciente, exame, tipo, grupo familiar, laboratório, unidade, responsável, datas, % preenchido, status, versão, consentimento, publicação, compartilhamento, ações), filtros salvos, seleção múltipla, ações em lote, visão tabela/cartões/etapas.
- **Estúdio (construtor)**: stepper de 7 etapas; lista de origens arrastáveis; painel de validação com soma automática; editor de mapa (busca país, raio, coordenadas); editor de animação em linha do tempo com blocos; botão de pré-visualização multi-dispositivo; barra de status de autosave; comentários internos laterais.

## 4. Storyboard da animação (padrão "Revelação Clássica")

1. 0–3s: fundo profundo + partículas suaves; frase 1.
2. 3–6s: frase 2 e botão.
3. 6–11s: pontos luminosos se conectam formando a hélice; rotação lenta.
4. 11–14s: hélice se desfaz; partículas viajam para posições geográficas.
5. 14–18s: contorno do mapa aparece gradualmente.
6. 18–26s: regiões pulsam em ordem decrescente de percentual (halos, expansões circulares, intensidade proporcional).
7. 26–32s: gráfico de composição entra pela direita, conectado por linhas às regiões.
8. 32s+: interface interativa liberada.

Modelos alternativos: Jornada Cinematográfica, Atlas Científico, História Familiar, Descoberta Minimalista, Mapa de Luzes, Migrações Ancestrais. Modo acessível: sem partículas, sem movimento, revelação instantânea com texto.

## 5. Componentes visuais

Fundo verde-escuro/grafite Care Kranich; glassmorphism moderado; luzes âmbar, azul-claro e vermelho infravermelho para os focos; mapa com textura de cartografia histórica; tipografia serifada nos títulos; espaços generosos; transições cinematográficas curtas. Proibido: neon excessivo, aparência de jogo, cores saturadas, animações longas.

## 6. Estrutura de dados

`ancestry_results` (paciente, exame, laboratório, algoritmo, população de referência, data de processamento, status, versão, consentimento, publicação, animação/config em JSON, autor, aprovadores, soft delete) · `ancestry_regions` (resultado, hierarquia continente→macrorregião→região genética→país→sub-região→território histórico→grupo populacional, percentual, faixa min/max, confiança, cor, intensidade, lat/lng, raio, ordem, textos resumido/completo/histórico/cultural/científico, limitações, referências, imagens) · `ancestry_routes` (origem, destino, período, descrição, incerteza) · `ancestry_timeline_events` (região, ano/período, título, texto) · `ancestry_result_versions` (snapshot, autor, campos alterados, justificativa, publicação) · `ancestry_shares` (destinatário, permissões, expiração, senha, acessos, revogação) · `ancestry_comments` (internos, menções, resolução) · `family_groups`, `family_members`, `family_relationships`, `family_documents` · `genetic_matches` + `match_consents` · `ancestry_audit_log`.

Cada resultado vincula: paciente, exame, laboratório, versão do algoritmo, população de referência, data, consentimento, status de revisão e versão do laudo.

## 7. APIs (internas, via Supabase + RPC)

CRUD por tabela com RLS; RPCs: `publish_ancestry_result(result_id)` (valida percentuais, gera versão, cria snapshot, notifica), `unpublish_ancestry_result`, `duplicate_ancestry_result`, `create_ancestry_share(result_id, perms, expires_at)`, `revoke_ancestry_share`, `compare_ancestry_versions(a,b)`, `soft_delete_ancestry_result` / `restore`. Leitura pública do compartilhado via token com expiração (SECURITY DEFINER, dados filtrados).

## 8. Matriz de permissões

| Papel | Criar/editar dados técnicos | Editar textos | Revisar | Aprovar/assinar | Publicar | Excluir def. | Ver resultado |
|---|---|---|---|---|---|---|---|
| Técnico laboratorial | ✔ (rascunho) | – | – | – | – | – | ✔ |
| Conteudista | – | ✔ | – | – | – | – | ✔ |
| Revisor científico | – | comentários | ✔ | ✔ (científico) | – | – | ✔ |
| Responsável técnico / médico | ✔ | ✔ | ✔ | ✔ | ✔ | – | ✔ |
| Admin do laboratório | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (após prazo) | ✔ |
| Super admin CK | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (todos tenants) |
| Paciente / autorizado | – | – | – | – | – | – | somente publicado, com consentimento |

Recepção, coleta e cuidadores **não** acessam dados de ancestralidade.

## 9. Estratégia mobile

Jornadas próprias (não redução do desktop): mapa full-screen com gestos, cartões deslizáveis, gráfico abaixo, painel em modal, linha do tempo horizontal, botão de jornada, compartilhamento nativo, árvore adaptada, vibração sutil opcional, carregamento progressivo (mapa leve primeiro, texturas depois).

## 10. Critérios de aceite

**Experiência**: abertura animada · mapa interativo com zoom/rotação/toque · pontos pulsantes e heat · 4 modos de gráfico · painel territorial completo · hierarquia geográfica · linha do tempo · rotas migratórias · histórico de versões com comparação · árvore e grupo familiar · comparação entre familiares · correspondências opcionais · compartilhamento controlado · PDF premium com QR · mobile próprio · acessibilidade (reduzir animações, contraste, teclado, descrição textual, paleta daltônica).

**Estúdio**: criar, ler, editar, excluir (soft delete + lixeira), restaurar, arquivar/desarquivar, duplicar, publicar/despublicar, agendar, compartilhar com expiração, exportar, comparar versões, gerar mapa/gráfico/animação/PDF, importar CSV/XLSX/JSON, ações em lote com confirmação, edição inline, drag and drop, autosave com recuperação, edição colaborativa com bloqueio de seção, comentários internos, alertas de inconsistência (soma ≠ 100%, região sem coordenada, texto/consentimento ausentes), templates, autopreenchimento com revisão humana obrigatória, permissões granulares, auditoria com usuário/data/IP/dispositivo/justificativa.

**Tom dos textos**: sempre "seu resultado apresenta semelhanças genéticas com populações historicamente relacionadas a esta região"; nunca "você é originário de X". Toda estimativa acompanhada de intervalo e nível de confiança.

## 11. Fases de implementação

1. **A1** — banco (resultados, regiões, versões, auditoria, shares) + Estúdio: construtor em etapas, CRUD, validação de percentuais, publicação.
2. **A2** — Experiência do paciente: revelação animada, mapa com pontos pulsantes, gráfico circular e barras, painel territorial.
3. **A3** — Linha do tempo, rotas migratórias, modo jornada, PDF premium, compartilhamento com expiração.
4. **A4** — Grupo familiar, árvore genealógica, comparação entre familiares, correspondências opcionais.
5. **A5** — Editor de animação sem código, templates, importação em lote, edição colaborativa, dashboard interno de ancestralidade.
