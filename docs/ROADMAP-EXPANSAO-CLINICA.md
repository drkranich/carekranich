# Care Kranich — Expansão para Plataforma SaaS Completa de Gestão Assistencial

> Pedido registrado em 01/08/2026. Implementação prevista para após a conclusão dos Lotes 1–5.
> Premissa central: preservar toda a estrutura existente (arquitetura, banco, componentes, glassmorphism, identidade visual) e evoluir por módulos contratáveis.

## Objetivo

Transformar a Care Kranich em uma plataforma SaaS de saúde de nível internacional, atendendo de cuidadores autônomos a grandes redes: clínicas médicas e multidisciplinares (fisioterapia, psicologia, fonoaudiologia, terapia ocupacional, nutrição, estética, vacinação), laboratórios de análises clínicas, centros de diagnóstico por imagem, instituições geriátricas, casas de repouso, home care, cooperativas médicas, empresas de cuidadores, hospitais de pequeno/médio porte, consultórios particulares, centros de reabilitação e (estrutura preparada) clínicas odontológicas.

Arquitetura modular: cada cliente contrata apenas os módulos necessários.

## Módulos

### 1. Gestão Completa de Clínicas (ERP clínico)
Cadastros: pacientes, responsáveis, convênios, médicos, especialidades, profissionais de saúde, enfermeiros, técnicos, recepcionistas, empresas conveniadas.

### 2. Agenda Inteligente
Múltiplos profissionais, unidades e salas; encaixes; confirmação automática; lista de espera; reagendamento; fila inteligente; bloqueios; férias; horários personalizados. Integração WhatsApp, SMS e e-mail com lembretes automáticos.

### 3. Prontuário Eletrônico
Evolução clínica, SOAP, CID, CIAP, exames, prescrições, alergias, histórico familiar e cirúrgico, medicamentos em uso, vacinação, anexos, fotos clínicas, assinatura digital, evolução multiprofissional. Modelos próprios por profissão.

### 4. Telemedicina
Videoconferência, chat, compartilhamento de exames, envio de receitas e atestados, gravação (quando permitido), assinatura digital, prescrição eletrônica.

### 5. Módulo Laboratorial
Cadastro de exames, painéis, perfis, valores, preparo, tempo de coleta, biomateriais.
Fluxo: Solicitação → Agendamento → Coleta → Triagem → Análise → Validação → Liberação → Entrega.
Resultados em PDF, imagens, laudos, vídeos e DICOM.

### 6. Diagnóstico por Imagem
Raio-X, tomografia, ressonância, mamografia, ultrassom, ecocardiograma, colonoscopia, endoscopia, densitometria. Laudos, comparação com exames anteriores, histórico, visualização online, download, compartilhamento seguro.

### 7. Gestão Geriátrica (diferencial Care Kranich)
Plano individual do idoso; escalas de cuidado (banho, alimentação, hidratação, sono, mobilidade, troca de fraldas); escalas clínicas (Braden, Morse, Mini Mental, Barthel, Katz); monitoramento de quedas; vacinas; rotina diária; visitas; fotos; comunicação familiar; relatórios automáticos.

### 8. Home Care
Escalas, plantões e trocas; geolocalização; check-in/check-out; assinatura digital; fotos da visita; checklist; tempo em residência; relatório automático.

### 9. Gestão Medicamentosa
Medicamentos, prescrições, reposição, lotes, validade, alertas, interações, estoque, dispensação, confirmação de administração (eMAR).

### 10. Financeiro Clínico
Faturamento, convênios, TISS, guias, glosas, recibos, PIX, cartão, boletos, parcelamentos, mensalidades, fluxo de caixa, DRE, centro de custos, comissões, produção médica, repasse.

### 11. Business Intelligence
Dashboards: ocupação, tempo médio, cancelamentos, no-show, retorno, produtividade, faturamento, lucro, receita, ticket médio, origem dos pacientes, retenção, NPS, satisfação, tempo médio de espera.

### 12. Inteligência Artificial (transversal)
Resumo automático de prontuários e consultas; sugestão de CID e tratamentos; leitura inteligente de exames; comparação de exames antigos; laudos preliminares; análise de riscos; predição de internação e readmissão; lembretes; auxílio à prescrição; chat interno para profissionais; assistente administrativo.

### 13. Portal do Paciente
Agendar/cancelar/reagendar, pagar, receber resultados, conversar com a clínica, ver receitas e histórico, solicitar documentos, assinar formulários, receber lembretes.

### 14. Aplicativo Mobile
Perfis com interface específica: paciente, familiar, cuidador, médico, profissional, administrador.

### 15. Integrações
Laboratórios, convênios, hospitais, operadoras, wearables (Apple Health, Google Health Connect, smartwatches), monitores de glicemia, oxímetros, pressão arterial, ECG, balanças inteligentes, sensores IoT.

## Requisitos de arquitetura (invioláveis)

- Arquitetura já existente (TanStack Start + Supabase + Cloudflare Workers)
- Glassmorphism e identidade visual Care Kranich (GlassSelect, GlassDatePicker, design system)
- Componentes reutilizáveis
- Multiempresa / multiclínica / multitenancy (RLS por tenant)
- Controle de permissões extremamente granular
- LGPD, criptografia, auditoria completa
- Versionamento de prontuários
- Escalabilidade internacional

## Ordem de execução

1. Concluir Lotes 1–5 (correções, contratos/assinatura, módulo de exames, integrações, funcionalidades maiores)
2. Iniciar expansão pelos módulos de maior sinergia com o existente: Gestão Geriátrica → Agenda Inteligente → Prontuário Eletrônico → ERP/Cadastros → Laboratorial → demais
