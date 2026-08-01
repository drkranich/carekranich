# Plano de Produto — Plataforma Diagnóstica Care Kranich

> Entregável exigido pela `DIRETRIZ-PLATAFORMA-DIAGNOSTICA.md` antes da implementação.
> Contém: 1) mapa do produto · 2) arquitetura de módulos · 3) mapa de usuários · 4) jornadas · 5) matriz de permissões · 6) modelo de dados · 7) fluxos operacionais · 8) roadmap · 9) prioridades · 10) critérios de aceite.

## 1. Mapa completo do produto

A plataforma é composta por 7 superfícies integradas sobre um único core multitenant:

| Superfície | Público | Rotas base |
|---|---|---|
| **Site público + catálogo** | visitantes/pacientes | `/`, `/exames`, `/exames/$slug` |
| **Portal do Paciente** | paciente, familiar, responsável | `/app/patient/*` (carteira de perfis familiares) |
| **Console do Laboratório/Clínica** | equipe do tenant | `/app/*` (dashboards por papel) |
| **Portal do Médico** | médicos solicitantes | `/app/doctor/*` |
| **Portal de Empresas** | RH/saúde ocupacional | `/app/corporate/*` |
| **Campo (coletador)** | coleta domiciliar | `/app/collector/*` (mobile-first) |
| **Super Admin Care Kranich** | administração central | `/app/admin/*` |

Núcleos funcionais: Catálogo (lab + imagem + genética), Agendamento inteligente, Carrinho/Orçamentos, Recepção/Check-in, Triagem pré-exame, Fluxo técnico (23 etapas), Amostras/Cadeia de custódia, Coleta domiciliar, Laudos/Resultados, Resultados críticos, Genética (kits + consentimento + bioinformática), Unidades, Equipamentos, Estoque, Financeiro, Tarefas, Comunicação, Dashboards/BI, IA assistiva, Permissões/Auditoria.

## 2. Arquitetura de módulos

Cada módulo é desacoplado, com tabelas próprias, RLS por tenant e eventos (tabela `platform_events` como barramento):

- **core**: tenants, units, profiles, roles, permissions, audit — já existente, expandido com `units` e permissões granulares.
- **catalog**: exam_catalog reescrito (categorias lab/imagem/genética, preparo, jejum, TAT, preço, convênios, domiciliar, página de produto, FAQ, relacionados, painéis/pacotes).
- **patients**: patients desacoplado de residents; dependents/guardians com autorizações.
- **scheduling**: appointments 2.0 com recursos (unidade+sala+equipamento+profissional), regras de incompatibilidade, lista de espera, recorrência.
- **orders**: pedido médico → requisição → itens; carrinho e orçamentos.
- **reception**: check-in, filas, senhas, pendências.
- **screening**: questionários dinâmicos por exame + desfechos.
- **lab-ops**: samples, aliquots, sample_events (23 etapas), rejeições, recoletas.
- **home-collection**: rotas, zonas, agenda do coletador, custódia.
- **results**: laudos versionados, assinatura, adendos, QR de verificação, críticos com protocolo.
- **genetics**: genetic_tests, kits, consentimentos, pipeline, variantes (acesso segregado).
- **assets/inventory**: equipment + maintenance; inventory_items + movimentações.
- **finance**: invoices, payments, repasses, glosas, DRE (Stripe/PIX na fase final de APIs).
- **tasks/comms**: central de tarefas e conversas unificadas (evolução do inbox atual).
- **bi**: views materializadas + dashboards por papel com widgets configuráveis.

Regras invioláveis mantidas: glassmorphism (GlassSelect/GlassDatePicker/GlassDateTimePicker), PT-BR acentuado, PDFs via lib/pdf, RLS `super_admin OR (tenant AND role)`, sem diagnóstico automático por IA.

## 3. Mapa de usuários

| Perfil | Superfície | Resumo de acesso |
|---|---|---|
| Super admin CK | Admin | tudo, todos os tenants, módulos, planos |
| Admin do tenant | Console | tudo do tenant |
| Gestor de unidade | Console | operação da(s) sua(s) unidade(s) |
| Recepcionista | Console | cadastro, agenda, check-in, cobrança — sem laudos/genética |
| Técnico de laboratório | Console | amostras, processamento, QC — sem financeiro |
| Biomédico/RT | Console | validação técnica, liberação, críticos |
| Médico patologista | Console | validação clínica, assinatura de laudos |
| Enfermeiro | Console | triagem, coleta, eMAR |
| Coletador | Campo | rota do dia, custódia — sem prontuário completo |
| Financeiro | Console | faturamento, conciliação — sem dados clínicos |
| Médico solicitante | Portal do Médico | somente pacientes vinculados |
| Paciente | Portal do Paciente | seus dados + perfis autorizados |
| Familiar/responsável | Portal do Paciente | dependentes com autorização registrada |
| Cuidador | Portal/Console | escopo mínimo definido pela autorização |
| Empresa (RH) | Corporativo | colaboradores e resultados ocupacionais permitidos |

## 4. Jornadas principais

1. **Paciente particular**: busca exame no site → página do exame → carrinho (sugestão de pacote, preparos conflitantes) → escolhe unidade/domiciliar → triagem dinâmica → paga → recebe instruções → check-in por QR → coleta → acompanha status etapa a etapa → resultado com explicação educativa e histórico → compartilha com médico.
2. **Filha cuidando do pai idoso**: cria perfil dependente → autorização registrada → agenda coleta domiciliar → acompanha rota do coletador → recebe laudo → tendências longitudinais → integra com módulo geriátrico (escalas, diário, eMAR).
3. **Médico solicitante**: cria pedido eletrônico assinado → paciente recebe link → agendamento vinculado ao pedido → alerta de resultado crítico → laudo comparativo no portal.
4. **Operação do laboratório**: recepção vê fila e pendências → amostra etiquetada → 23 etapas com registro de usuário/hora/evidência → rejeição gera tarefa de recoleta → RT valida → patologista assina → liberação comunica paciente e médico.
5. **Genética**: compra do kit → envio/rastreio → ativação por código → consentimento explícito → coleta guiada → recepção da amostra → pipeline → interpretação → laudo com aconselhamento recomendado → acesso reforçado.
6. **Empresa**: RH importa colaboradores → campanha de periódicos → agendamento em massa por unidade → faturamento corporativo por centro de custo.

## 5. Matriz de permissões (resumo)

Modelo: RBAC (papéis acima) + ABAC (unidade, vínculo paciente-profissional, autorização familiar, sensibilidade do dado). Implementação: `permission_grants` (papel × módulo × ação) + `patient_authorizations` (quem vê o quê de quem, com escopo e validade) + coluna `sensitivity` (normal | restricted | genetic) nos dados clínicos. Regras de ouro:

- Genética: exige `genetic_access` explícito + autorização do titular; recepção/coleta nunca acessam.
- Resultados: paciente vê após liberação; familiar só com autorização vigente; médico só vinculado ao pedido.
- Financeiro × clínico segregados; auditoria (`audit_log`) em toda leitura sensível e toda mudança de estado.
- Acesso temporário com expiração; downloads registrados.

## 6. Modelo de dados (novas entidades por fase)

- **F1**: `units`, `patients`, `patient_authorizations`, `exam_catalog` (v2 c/ ~40 campos), `exam_panels`, `exam_orders` + `exam_order_items` (carrinho/orçamento/pedido), `appointments` (v2 c/ unit_id, room_id, equipment_id, order_item_id), `checkins`, `screening_forms` + `screening_answers`, `queue_tickets`.
- **F2**: `samples`, `sample_events`, `aliquots`, `lab_reports` + `report_versions`, `critical_results`, `doctor_links`, `doctor_orders`.
- **F3**: `genetic_tests`, `genetic_kits`, `kit_events`, `consent_forms` + `consent_records`, `genetic_results` (segregado), `counseling_sessions`.
- **F4**: `equipment`, `equipment_maintenance`, `rooms` (v2), `imaging_studies` (metadados DICOM).
- **F5**: `invoices`, `payments`, `insurance_plans`, `companies` + `employees`, `inventory_items` + `inventory_moves`, `quality_incidents`.
- **F6**: `platform_events`, `automation_rules`, `ai_reviews`.

Todas com tenant_id (+ unit_id quando aplicável), índices por tenant/status/data, RLS padrão `has_role(super_admin) OR (tenant AND papel adequado)` e políticas extras ABAC para paciente/familiar/médico.

## 7. Fluxos operacionais

- **Amostra**: state machine com 23 estados nomeados (`sample_events.stage`), transições válidas registradas em tabela de regras; toda transição grava usuário, timestamp, unidade, equipamento, observação e evidência (storage). Rejeição → tarefa automática de recoleta.
- **Resultado crítico**: flag na validação → bloqueia liberação automática → cria `critical_results` com SLA → tarefas de contato (tentativas registradas) → só encerra com confirmação de comunicação.
- **Laudo**: rascunho → revisão → validação técnica → validação clínica → assinado (hash SHA-256 + QR de verificação pública limitada) → liberado → adendo/retificação geram nova versão preservando a anterior.
- **Agendamento**: motor valida unidade×exame×equipamento×profissional×preparo×dependências antes de confirmar; conflitos retornam motivo claro; lista de espera alimenta encaixes.
- **Check-in**: QR do agendamento → pendências (termo, jejum, pagamento, documento) precisam estar verdes antes de gerar senha.

## 8. Roadmap (fases da diretriz)

F1 Fundação diagnóstica → F2 Operação laboratorial + portal do médico → F3 Genética → F4 Imagem/equipamentos → F5 Financeiro/empresas/BI/estoque → F6 IA/automações. APIs externas (Stripe, Google, WhatsApp/SMS) permanecem para a fase final de integrações, conforme decisão do fundador.

## 9. Prioridades imediatas

1. Migração F1 (units, patients, catálogo v2, orders, appointments v2, triagem, check-in).
2. Catálogo v2 no console + páginas públicas de exame + carrinho.
3. Portal do Paciente (perfis familiares, agendamentos, resultados, histórico).
4. Recepção/check-in + filas.
5. F2 na sequência (amostras, laudos, críticos, portal do médico) — sem pausa entre fases.

## 10. Critérios de aceite (por módulo)

Um módulo só é dado como pronto quando: estados e transições implementados com registro de auditoria; permissões testadas por papel (inclusive negações); RLS válida para super_admin e tenant; PT-BR completo e componentes glass; dashboards do módulo com dados reais (nunca vazios decorativos); PDFs onde a diretriz exige; erros com mensagens claras; e fluxo ponta a ponta executável em produção (workers `carekranich` e `care-kranich`). Nenhuma tela sem função; nenhum card decorativo.
