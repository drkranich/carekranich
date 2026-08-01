# Diretriz — Módulo Interativo de Genealogia e Ancestralidade

> Diretriz oficial do fundador (01/08/2026). Experiência de revelação de origens genéticas + estúdio editorial CRUD completo. Não deve ser um relatório laboratorial: é um atlas pessoal da história do paciente — ciência, emoção, história, geografia e família. Identidade própria da Care Kranich, sem copiar concorrentes.

## Experiência do paciente
1. **Nome do módulo**: seção exclusiva (candidatos: Minhas Origens, Jornada Ancestral, Atlas Familiar...). Deve transmitir pertencimento, descoberta e profundidade.
2. **Abertura em revelação** (não dashboard): fundo escuro profundo com partículas → "Seu DNA guarda caminhos percorridos por muitas gerações." → "Agora, parte dessa história pode ser revelada." → botão "Descobrir minhas origens" → hélice de DNA formada por pontos luminosos girando sutilmente → hélice se desfaz em partículas que formam o mapa-múndi → regiões pulsam conforme o percentual (maior % = mais intenso).
3. **Mapa-múndi interativo**: zoom, navegação por toque, seleção continente/região/país, pontos pulsantes, mapas de calor, linhas migratórias, tooltips, filtros, modo claro/escuro, reprodução automática, modo acessível sem animação. Camadas: origem genética atual, regiões ancestrais, rotas migratórias, linha do tempo, conexões familiares, correspondências (com privacidade).
4. **Pontos pulsantes / efeito infravermelho**: linguagem visual própria — ondas, halos, expansões circulares, agrupamentos, reação ao cursor. Hover: região, percentual, grupo genético, país, identificação histórica. Clique: painel detalhado.
5. **Gráfico de composição** em 4 modos: círculo de ancestralidade (sincronizado com o mapa), barras territoriais (com confiança), constelação genética, camadas familiares (só com consentimento).
6. **Hierarquia geográfica**: continente → macrorregião → região genética → país → sub-região → território histórico → grupo populacional → área cultural (ex.: Europa → Europa Central → Alemanha → Norte da Alemanha → Pomerânia).
7. **Painel detalhado por origem**: cabeçalho (nome, %, confiança, mapa), texto educativo não determinista ("Seu resultado apresenta semelhanças genéticas com populações historicamente relacionadas a esta região" — nunca "você é definitivamente daqui").
8. **Linha do tempo histórica** interativa por origem (povos antigos, migrações, impérios, diásporas, imigração ao Brasil).
9. **Rotas de migração** animadas com período, povos, contexto e grau de incerteza — referências populacionais, não genealogia individual exata.
10. **História familiar personalizada**: fotos, documentos, certidões, histórias, áudios, cartas — diferenciando dado genético × declarado × documento × inferência.
11. **Árvore genealógica**: construtor visual, convites, vínculos, fotos, documentos, testes vinculados, privacidade por pessoa; modos vertical/horizontal/radial/gerações/geográfico/cronológico.
12. **Grupo familiar** isolado por titular; nada compartilhado automaticamente — cada acesso depende de autorização.
13. **Comparação entre familiares**: regiões compartilhadas/diferentes, estimativa de parentesco, origem materna/paterna possível, animação de mapas se aproximando.
14. **Correspondências genéticas** opt-in: apelido, mensagens, bloqueio, denúncia, revogação; nunca revelar dados sensíveis sem consentimento.
15. **Indicador de confiança**: alta/moderada/estimativa ampla; intervalo percentual, metodologia, população de referência, versão do algoritmo.
16. **Resultados atualizáveis**: histórico de versões, comparação animada original × atual, motivo e metodologia.
17. **Modo Jornada**: "Assistir à minha jornada ancestral" — narrativa automática com legendas, velocidade, pausa; sem música automática.
18. **Modo compartilhável**: cartão, imagem, mapa animado — o paciente escolhe o que expor; nunca dados clínicos/variantes/familiares sem autorização explícita.
19. **PDF premium editorial**: capa, mapa, composição, textos históricos, linha do tempo, metodologia, limitações, glossário, QR para a experiência digital.
20. **Design**: fundo profundo (azul/grafite/verde escuro), glassmorphism moderado, luzes âmbar/azul-claro/infravermelho, partículas, transições cinematográficas, cartografia histórica sutil. Evitar neon, aparência de jogo, cores saturadas, animações demoradas.
21. **Acessibilidade**: reduzir animações, desativar partículas, contraste, leitor de tela, teclado, versão estática, paleta para daltonismo — informação nunca depende só de cor/animação.
22. **Mobile redesenhado**: mapa em tela cheia, cartões deslizáveis, painel em modal, gestos, linha do tempo horizontal.
23. **Dados**: ancestry_results, ancestry_regions/percentages/confidence_ranges, geographic/historical_regions, population_reference_groups, migration_routes, report_versions, explanations, family_groups/members/relationships/trees/documents, genetic_matches, match_consents, shared_regions, timelines, visualization_settings, result_shares, privacy_preferences — vinculados a paciente, exame, laboratório, algoritmo, população de referência, consentimento e versão do laudo.
24. **CMS interno de conteúdo** (continentes, regiões, povos, textos, mapas, rotas, linhas do tempo) com fluxo criação → revisão editorial → histórica → científica → aprovação → publicação.
25. **Integração com o pipeline genético**: o visual nunca inventa percentuais; reprocessamento mantém versão anterior e comunica.
26. **Privacidade**: consentimento específico, autenticação reforçada, criptografia, logs, expiração de links, revogação, exclusão, LGPD.
27. **Tom dos textos**: emocional e responsável; estimativas, nunca promessas absolutas.
28. **Dashboard interno**: exames processados, em revisão, falhas, versões, consentimentos, compartilhamentos, engajamento.
29. **Critérios de aceite**: abertura animada + mapa + pontos + calor + gráfico + painéis + hierarquia + linha do tempo + rotas + versões + árvore + grupo familiar + privacidade + comparação + compartilhamento + PDF + mobile + acessibilidade + CMS + logs.

## Estúdio editorial (Complemento obrigatório — CRUD sem código)
1. **Construtor de Resultado Ancestral**: a equipe insere dados e o sistema gera automaticamente mapa, pontos, calor, gráficos, animação, painéis, linha do tempo, rotas, PDF, versão mobile e compartilhável.
2. **Fluxo guiado em 7 etapas**: seleção do paciente (busca, consentimentos) → seleção do exame (kit, algoritmo, população de referência, responsável) → inserção de origens (hierarquia completa, %, intervalo, confiança, cor, intensidade, coordenadas, raio, textos histórico/cultural/científico, limitações, referências, rotas) → validação de percentuais (soma ≤100%, alertas, duplicidades, arredondamento justificado) → configuração da animação por controles visuais (estilo, velocidade, ordem, pulsação, halos, zoom, legendas, modo reduzido) → pré-visualização (desktop/tablet/celular/PDF/acessível/jornada) → revisão e publicação (rascunho → técnico → revisão → validação científica → médica → aprovação → publicação → arquivamento; fluxo configurável por laboratório).
3. **CRUD completo** + duplicar, arquivar/desarquivar, publicar/despublicar, compartilhar, exportar, restaurar, comparar versões, observação, solicitar revisão, transferir responsabilidade