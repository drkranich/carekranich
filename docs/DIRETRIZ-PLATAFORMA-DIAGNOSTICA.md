# Diretriz de Expansão — Plataforma Laboratorial, Clínica, Genética e Assistencial Completa

> Diretriz oficial do fundador (01/08/2026). Integra a tarefa "Expansão SaaS clínico completo (pós-lotes)".
> Substitui qualquer implementação superficial: nada de dashboards genéricos, telas de poucos cards ou fluxos limitados.
> Referência de qualidade: melhores empresas de medicina diagnóstica, laboratórios premium, plataformas de saúde digital e serviços de testes genéticos.

A Care Kranich deve combinar: gestão laboratorial, gestão clínica, atendimento ao paciente, aplicativo do paciente, agendamento inteligente, exames laboratoriais, diagnóstico por imagem, testes genéticos, coleta domiciliar, gestão de unidades, logística de amostras, operação técnica interna, integração com profissionais de saúde, portal do médico, acompanhamento longitudinal, teleassistência, IA, gestão financeira, relacionamento com familiares, home care e relatórios avançados.

A plataforma é o ecossistema pelo qual o paciente localiza, compara, agenda, paga, realiza, acompanha e compreende seus exames. Cada tenant (laboratório, clínica, instituição geriátrica, centro de diagnóstico) tem dashboards, configurações, catálogo, unidades, profissionais, regras comerciais e identidade visual próprios. Multiempresa, multiclínica, multiunidade, multitenant, modular, preparada para escala.

## 1. Ecossistema

### 1.1 Care Kranich Super Admin
Gerenciar todos os clientes; criar laboratórios e redes; ativar/desativar módulos; planos e assinaturas; limites de uso; consumo de armazenamento; volume de agendamentos; nº de pacientes; exames processados; receitas e inadimplência; integrações; permissões globais; logs; segurança; recursos de IA; saúde operacional por tenant; versões de módulos; recursos beta; planos personalizados; preços por módulo; suporte; incidentes; uso de APIs; webhooks; documentos legais; conformidade LGPD; bloqueio de contas em risco; relatórios globais; catálogo global opcional de exames.

### 1.2 Dashboard do Laboratório
Central operacional completa, em tempo real: agendamentos do dia; pacientes aguardando/em atendimento; exames em coleta/triagem/processamento; amostras rejeitadas/pendentes; exames aguardando validação técnica e assinatura médica; resultados críticos; recoletas; exames atrasados/liberados/entregues; coletas domiciliares em rota; profissionais disponíveis; ocupação de salas e unidades; tempos médios (espera, coleta, processamento); no-show; cancelamento; faturamento dia/mês; exames mais vendidos; convênios com maior volume; exames com maior margem/repetição/atraso recorrente; unidades com maior movimento; estoque de insumos; materiais a vencer; manutenção de equipamentos; falhas de integração; mensagens pendentes; solicitações médicas não processadas.

Widgets reorganizáveis por drag and drop. Dashboard diferente por perfil: administrador, gestor de unidade, recepcionista, técnico, biomédico, patologista, enfermeiro, coletador, financeiro, logística, atendimento, qualidade, auditoria, marketing, suporte, responsável técnico.

## 2. Aplicativo do Paciente
Conta; validação de identidade; dependentes (filhos, pais idosos); responsáveis legais; autorizações; localizar laboratórios/unidades; filtrar e comparar; horários; preços; convênios; preparo; prazo; coleta presencial ou domiciliar; agendar múltiplos exames; pacotes; pagar; anexar pedido médico e documentos; assinar termos; questionários pré-exame; instruções; remarcar; cancelar; reembolso; acompanhar chegada do coletador; status do exame; resultados; laudos; downloads; compartilhar; autorizar acesso médico; segunda via; chat com laboratório e central; registrar sintomas; lembretes; histórico; comparação de resultados; tendências; orientações não diagnósticas; suporte; contestação; avaliação.

Perfis familiares: filha acompanha pai idoso com autorização; responsável agenda para criança; cuidador profissional tem acesso restrito ao necessário.

## 3. Catálogo de Exames (amplo)
- **3.1 Laboratoriais**: hemograma, glicemia, colesterol, triglicérides, função renal/hepática, eletrólitos, vitaminas, minerais, hormônios, marcadores tumorais, sorologias, imunologia, microbiologia, parasitologia, urinálise, toxicologia, coagulação, anatomia patológica, citopatologia, alergologia, infecciosos, ocupacionais, pré-operatórios, painéis preventivos e por faixa etária.
- **3.2 Imagem**: raio X, ultrassonografia, tomografia, ressonância, densitometria, mamografia, ecocardiograma, doppler, endoscopia, colonoscopia, PET-CT, medicina nuclear, ECG, holter, MAPA, polissonografia.
- **3.3 Genéticos** (módulo independente): ancestralidade, predisposição, farmacogenética, nutrigenética/nutrigenômica, oncogenética, cardiogenética, doenças hereditárias e raras, saúde reprodutiva, compatibilidade, triagem neonatal, portadores, painéis hereditários, paternidade/parentesco, microbioma, epigenética, risco poligênico, resposta a medicamentos, performance esportiva, metabolismo, intolerâncias, dermatologia, envelhecimento saudável, painéis personalizados.

Cada exame genético: nome comercial e técnico, descrição, indicação, limitações, material biológico, método de coleta, tecnologia, tipo de análise, genes analisados, prazo, preparo, aconselhamento, faixa etária, documentos, termo de consentimento, autorização de armazenamento e uso de dados, exclusão futura, política de descarte, forma de entrega, consulta pós-resultado.

Resultados genéticos sensíveis exigem: controle especial de acesso, consentimento explícito, trilha de auditoria, autenticação reforçada, recomendação de aconselhamento, explicações acessíveis, separação dado técnico × interpretação clínica, aviso de limitações, indicação clara de que predisposição não é diagnóstico. Nunca superficial nem alarmista.

## 4. Página individual de cada exame
Página estilo produto premium: nome, descrição, benefícios, indicação, recomendado/não indicado, material, preparo, jejum, prazo, unidades, preço, parcelamento, convênios, coleta domiciliar, FAQ, termos, riscos, limitações, detalhes técnicos, especialistas vinculados, avaliações, exames e pacotes relacionados, agendar, adicionar ao carrinho, presente, agendar para familiar. Exames complexos podem exigir triagem antes do agendamento.

## 5. Agendamento inteligente
Considerar: unidade, sala, equipamento, profissional, duração, preparo, idade, sexo biológico quando clinicamente necessário, mobilidade, acompanhante, sedação, autorização, disponibilidade de equipamento, convênio, capacidade, coleta domiciliar, distância, janela de coleta, prioridade, urgência, dependências entre exames, jejum, restrições, medicamentos, questionário, consulta prévia.

Bloquear agendamentos incompatíveis (ex.: ressonância sem equipamento; sedação sem profissional habilitado; coleta domiciliar de exame com processamento imediato sem logística). Permitir: individual, familiar, em lote, corporativo, por médico, por clínica, por convênio, recorrente, encaixe, lista de espera, prioridade, reagendamento automatizado, redistribuição entre unidades, confirmação automática, lembrete multicanal.

## 6. Carrinho e pacotes
Detectar duplicados; sugerir pacotes econômicos; preparos conflitantes; realização conjunta; taxa domiciliar; descontos; validação de pedido médico; cobertura de convênio; separar cobertos × particulares; pagamento híbrido; parcelamento; cupom; crédito; assinatura preventiva; orçamento empresarial; orçamento em PDF; salvar/compartilhar/converter orçamento em agendamento.

## 7. Coleta domiciliar
Zonas de atendimento; distância; taxa de deslocamento; agenda do coletador; otimização de rotas; rastreamento; check-in/out; confirmação de identidade; QR Code; registro de material; temperatura; cadeia de custódia; fotos autorizadas; assinatura do paciente; intercorrências; tentativa sem sucesso; nova coleta; transporte; previsão de chegada; comunicação em tempo real; comprovação; controle de kits/embalagens/descarte; confirmação de chegada ao laboratório. Paciente acompanha a rota quando permitido.

## 8. Recepção e check-in
Check-in presencial/QR/tablet; validação de documentos; termos; confirmação de preparo e jejum; prioridade; etiquetas; senhas; painel de chamada; triagem; atraso; reagendamento; cobrança; recibo; validação de convênio; filas por procedimento/unidade/profissional/prioridade. Ver todas as pendências antes de liberar o paciente.

## 9. Triagem clínica pré-exame
Questionários dinâmicos (perguntar só o necessário): gravidez, alergias, medicamentos, anticoagulantes, marcapasso, implantes, próteses, cirurgias recentes, diabetes, doença renal, claustrofobia, peso, altura, reações, jejum, sintomas, mobilidade, sedação, histórico familiar. Resultado pode: liberar, alertar, pedir revisão, exigir documento, pedir autorização médica, bloquear temporariamente, encaminhar a atendimento humano.

## 10. Fluxo técnico laboratorial (23 etapas)
Pedido recebido → cadastro validado → agendamento confirmado → paciente identificado → coleta → etiqueta vinculada → transporte → recebimento → triagem técnica → centrifugação → separação → alíquota → processamento → controle de qualidade → análise → revisão → validação técnica → validação clínica → assinatura → liberação → comunicação → arquivamento → descarte. Cada etapa registra: usuário, data, hora, unidade, equipamento, status, observação, evidência, motivo de alteração, histórico, assinatura quando aplicável.

## 11. Gestão de amostras
Código de barras; QR; RFID futuro; ID única; material; volume; recipiente; data/hora; responsável; temperatura; transporte; estabilidade; armazenamento (freezer/geladeira/estante/posição); descarte; cadeia de custódia; status; amostra principal e alíquotas; repetição; recoleta; transferência entre unidades; envio a laboratório parceiro; retorno; descarte seguro.

## 12. Módulo genético avançado
Dashboard exclusivo: kits enviados/entregues/ativados/aguardando coleta; amostras em transporte/recebidas/inadequadas; extração de DNA; QC; sequenciamento; bioinformática; interpretação; revisão; laudo em elaboração/liberado; aconselhamento pendente; consentimentos pendentes; solicitações de exclusão; armazenamento; descarte programado; volume por painel; tempo médio por etapa; taxa de falha; taxa de recoleta.

Kit: compra, envio, rastreamento, ativação, associação ao paciente, leitura do código, instruções, vídeo, consentimento, registro de coleta, envio, acompanhamento por etapas, falha, nova coleta, consulta pós-resultado.

Bioinformática (arquitetura): importação de arquivos, pipelines, versionamento, anotação e classificação de variantes, revisão, validação, auditoria, armazenamento criptografado, separação de dados identificáveis, acesso altamente restrito. **Sem diagnóstico automático sem validação profissional.** IA auxilia, organiza, resume, destaca — validação clínica é de profissionais habilitados.

## 13. Laudos e resultados
Modelos; campos dinâmicos; tabelas; gráficos; imagens; curvas; valores de referência; comentários; histórico; comparação; assinatura; coassinatura; revisão; adendo; retificação; versão anterior; data de liberação; responsável; QR; verificação pública limitada; compartilhamento temporário; impressão; PDF; mobile. Para o paciente: resultado técnico, faixa de referência, variação histórica, explicação educativa, FAQ, recomendação médica, alertas críticos, compartilhar, agendar consulta. Compreensível sem substituir o médico.

## 14. Resultados críticos
Bloquear liberação automática quando necessário; alertar responsável técnico e médico; registrar tentativas e contatos (horário, pessoa comunicada); confirmação; gerar tarefa; acompanhar até encerramento; histórico completo. Nunca depender só de notificação visual.

## 15. Portal do médico
Cadastrar pacientes; solicitar exames; criar/assinar/enviar pedidos eletrônicos; acompanhar agendamentos e resultados; histórico; comparação; urgência; observações clínicas; chat com laboratório; alertas críticos; laudos; compartilhar com paciente; pendências; protocolos; pacientes vinculados; equipe; produção; repasses.

## 16. Portal de empresas (ocupacional)
Empresas; colaboradores; importação de listas; agendamento em massa; campanhas; admissionais/periódicos/demissionais/retorno/mudança de função; toxicologia; vacinação; check-ups; faturamento corporativo; centros de custo; relatórios; filiais; documentos; autorização; exportação.

## 17. Dashboards executivos
- **Operacionais**: exames, pacientes, tempo médio, espera, produtividade, volume por unidade/profissional, recoleta, rejeição, atraso, capacidade, ocupação, cancelamentos, no-show, satisfação, reclamações, incidentes.
- **Financeiros**: receita, lucro, margem, custos, recebimentos, inadimplência, ticket médio, receita por exame/unidade/profissional/convênio, particular, descontos, reembolsos, glosas, comissões, repasses, custos de coleta/logística/laboratoriais, margem por exame.
- **Clínicos/qualidade**: críticos, recoletas, alterados, não conformidades, erros pré/analíticos/pós, amostras inadequadas, tempo de liberação, QC, reclamações, incidentes, eventos adversos.
- **Personalizados**: filtros, períodos, comparação, exportação, widgets, metas, alertas, favoritos, compartilhamento, visão por unidade/consolidada/grupo, dashboards próprios.

## 18. Central de tarefas
Integrada a todos os módulos (confirmar agendamento, cobrar documento, revisar amostra, recoleta, validar laudo, responder paciente, corrigir cadastro, contatar médico, verificar pagamento, revisar consentimento, aconselhamento, não conformidade, manutenção, estoque). Cada tarefa: responsável, equipe, prioridade, prazo, status, origem, paciente, exame, unidade, comentários, anexos, checklist, histórico, automações, escalonamento.

## 19. Central de comunicação
Unificar WhatsApp, e-mail, SMS, chat, telefone, push, mensagens internas. Conversa vinculada a paciente/responsável/exame/agendamento/unidade/atendimento/protocolo/profissional. Templates; automações; filas; transferência; tags; prioridade; SLA; histórico; anexos; consentimento; respostas sugeridas por IA.

## 20. Inteligência artificial
Apoiar sem substituir profissionais: resumos de histórico e laudos, organização de documentos, classificação de solicitações, pendências, previsão de no-show, sugestão de horários, duplicidade, apoio ao atendimento, explicação educativa, relatórios, análise operacional, previsão de demanda, gargalos, satisfação, fraude, inconsistências, apoio à revisão técnica, priorização. Toda resposta de IA clínica: origem identificada, aviso de apoio, revisão humana, registro, possibilidade de rejeição, sem diagnóstico autônomo.

## 21. Gestão de unidades
Por unidade: endereço, horários, salas, equipamentos, profissionais, exames disponíveis, convênios, capacidade, feriados, acessibilidade, estacionamento, coleta infantil, coleta domiciliar, imagem, materiais, estoque, metas, preços, identidade visual, contatos, regras.

## 22. Equipamentos e manutenção
Cadastro, série, fabricante, modelo, unidade, sala, responsável, manutenção preventiva/corretiva, calibração, certificados, garantia, peças, falhas, indisponibilidade, impacto em agendas, alertas, bloqueio de agenda, histórico, custos, prestadores.

## 23. Estoque e insumos
Tubos, agulhas, reagentes, kits, lâminas, embalagens, EPIs, descartáveis, materiais de coleta e transporte. Lote, validade, fornecedor, entrada/saída, consumo, reserva, mínimo, transferência, perda, descarte, recall, rastreabilidade, custo, inventário, previsão de reposição.

## 24. Financeiro e faturamento
Particular, convênio, empresa, assinatura, pacote, parcelamento, PIX, cartão, boleto, link de pagamento, crédito, reembolso, desconto, cupom, comissão, repasse, faturamento por unidade, conciliação, inadimplência, contas a pagar/receber, DRE, fluxo de caixa, centros de custo, orçamento, notas fiscais, integração contábil, relatórios.

## 25. Permissões e segurança
Extremamente granulares (recepcionista sem acesso a resultados genéticos; coletador só o necessário; profissional só pacientes vinculados; familiar só o autorizado). RBAC + ABAC; por módulo/unidade/paciente/exame; MFA; logs; criptografia; mascaramento; sessão segura; expiração; consentimento; trilha de auditoria; segregação; acesso temporário; download controlado; bloqueio; alertas de acesso anormal.

## 26. Experiência visual
Transmitir tecnologia, precisão, confiança, cuidado, sofisticação, modernidade, clareza, humanidade. Identidade Care Kranich; glassmorphism sem prejudicar legibilidade/acessibilidade/contraste/velocidade/operação clínica. Evitar dashboards vazios, cards repetitivos, decoração excessiva, telas genéricas, aparência de template, blocos sem função, menus desorganizados, falta de hierarquia. Cada dashboard reflete o papel do usuário.

## 27. Responsividade
Desktop, notebook, tablet, celular, totens, telas de recepção, tablets de coleta, campo. Mobile com jornadas próprias por perfil (paciente, coletador, médico, cuidador, recepção, gestor) — não apenas redução da tela desktop.

## 28. Arquitetura técnica
Compatível com o projeto atual; módulos desacoplados; componentes reutilizáveis; APIs versionadas; eventos; filas; webhooks; logs estruturados; monitoramento; observabilidade; retentativas; idempotência; cache; processamento seguro; armazenamento segregado; backups; recuperação; testes; documentação; ambientes; feature flags; auditoria.

## 29. Banco de dados
Entidades: tenants, organizations, units, departments, users, roles, permissions, patients, dependents, guardians, professionals, appointments, exams, panels, orders, requisitions, collections, samples, aliquots, kits, shipments, routes, results, reports, genetic_tests, genetic_variants, consent_forms, devices, equipment, rooms, invoices, payments, reimbursements, inventory, suppliers, tasks, conversations, notifications, incidents, audits, integrations, webhooks. Relacionamentos coerentes, índices, integridade referencial, RLS por tenant.

## 30. Fases de implementação
1. **Fase 1** — arquitetura multiempresa, unidades, pacientes, catálogo, agendamento, aplicativo (portal do paciente), pagamentos, recepção, check-in.
2. **Fase 2** — coleta, amostras, laboratório, resultados, laudos, portal do médico, dashboards.
3. **Fase 3** — genética, kits, consentimento, rastreamento, bioinformática, aconselhamento, segurança reforçada.
4. **Fase 4** — imagem, DICOM, equipamentos, salas, sedação, laudos especializados.
5. **Fase 5** — financeiro, convênios, empresas, BI, estoque, qualidade, auditoria.
6. **Fase 6** — IA, automações, predição, expansão internacional, integrações avançadas.

## 31. Entregáveis por módulo
Visão do produto, objetivos, personas, fluxos, jornadas, wireframes, arquitetura, modelo de dados, APIs, permissões, regras de negócio, estados, validações, erros, automações, notificações, dashboards, relatórios, testes, critérios de aceite, documentação técnica e funcional, roadmap, riscos, dependências. **Módulo só está completo quando fluxo operacional, regras, permissões, estados, integrações, erros, notificações, dashboards e relatórios estiverem definidos.**

## Orientação final
A Care Kranich não é um calendário, prontuário básico, painel de cards, sistema de cadastro, agenda médica, página de resultados ou app de lembretes. É um sistema operacional completo de saúde: pacientes + familiares + cuidadores + médicos + clínicas + laboratórios + unidades + profissionais + exames + dados + logística + assistência + acompanhamento contínuo. Revisar tudo o que já foi implementado, identificar módulos superficiais e substituí-los por módulos operacionais completos. Antes de implementar cada fase: mapa do produto, arquitetura de módulos, mapa de usuários, jornadas, matriz de permissões, modelo de dados, fluxos operacionais, roadmap, prioridades e critérios de aceite (ver `PLANO-PLATAFORMA-DIAGNOSTICA.md`).
