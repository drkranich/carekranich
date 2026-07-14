-- Staff access profiles, editable plan catalog details, and improved system email templates.

create table if not exists public.platform_staff_access_profiles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  label text not null,
  description text,
  allowed_routes text[] not null default array[]::text[],
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_staff_access_profiles enable row level security;

drop policy if exists "staff access profiles select active" on public.platform_staff_access_profiles;
create policy "staff access profiles select active" on public.platform_staff_access_profiles
  for select to authenticated
  using (active = true or public.is_super_admin(auth.uid()));

drop policy if exists "staff access profiles super manage" on public.platform_staff_access_profiles;
create policy "staff access profiles super manage" on public.platform_staff_access_profiles
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop trigger if exists platform_staff_access_profiles_touch on public.platform_staff_access_profiles;
create trigger platform_staff_access_profiles_touch
before update on public.platform_staff_access_profiles
for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.platform_staff_access_profiles to authenticated;

insert into public.platform_staff_access_profiles (role_key, label, description, allowed_routes, active)
values
  (
    'family',
    'Usuario comum / familia',
    'Acesso para familiares e usuarios comuns que acompanham um residente.',
    array[
      '/app','/app/profile','/app/notifications','/app/residents','/app/timeline',
      '/app/care-plan','/app/memory','/app/emergency','/app/twin','/app/cognitive',
      '/app/longevity','/app/ai','/app/alerts','/app/smart-home','/app/telemedicine',
      '/app/documents','/app/inbox','/app/identity','/app/agents','/app/agents/recommendations'
    ],
    true
  ),
  (
    'caregiver',
    'Cuidador',
    'Equipe de cuidado direto com foco em rotina, tarefas e registros.',
    array[
      '/app','/app/profile','/app/notifications','/app/residents','/app/timeline',
      '/app/care-plan','/app/emergency','/app/caregiver','/app/academy',
      '/app/twin','/app/cognitive','/app/longevity','/app/ai','/app/alerts',
      '/app/documents','/app/inbox','/app/identity','/app/agents','/app/agents/recommendations'
    ],
    true
  ),
  (
    'nurse',
    'Enfermagem',
    'Equipe clinica com acesso a plano de cuidado, qualidade, medical e documentos.',
    array[
      '/app','/app/profile','/app/notifications','/app/residents','/app/timeline',
      '/app/care-plan','/app/emergency','/app/caregiver','/app/quality','/app/academy',
      '/app/medical','/app/twin','/app/cognitive','/app/longevity','/app/ai',
      '/app/alerts','/app/documents','/app/inbox','/app/identity','/app/agents',
      '/app/agents/recommendations','/app/telemedicine'
    ],
    true
  ),
  (
    'doctor',
    'Medico',
    'Acesso clinico superior para medical, telemedicina, documentos e qualidade.',
    array[
      '/app','/app/profile','/app/notifications','/app/residents','/app/timeline',
      '/app/care-plan','/app/emergency','/app/caregiver','/app/quality','/app/academy',
      '/app/medical','/app/twin','/app/cognitive','/app/longevity','/app/ai',
      '/app/alerts','/app/documents','/app/inbox','/app/identity','/app/agents',
      '/app/agents/recommendations','/app/telemedicine'
    ],
    true
  ),
  (
    'clinic_admin',
    'Administrador da clinica',
    'Gestao operacional da organizacao, equipe, contratos, cobranca e qualidade.',
    array[
      '/app','/app/profile','/app/notifications','/app/residents','/app/timeline',
      '/app/care-plan','/app/emergency','/app/caregiver','/app/quality','/app/academy',
      '/app/medical','/app/marketplace','/app/agents','/app/agents/recommendations',
      '/app/twin','/app/cognitive','/app/longevity','/app/ai','/app/alerts',
      '/app/workflows','/app/smart-home','/app/telemedicine','/app/command',
      '/app/documents','/app/tenants','/app/contracts','/app/billing','/app/inbox',
      '/app/email-marketing','/app/identity'
    ],
    true
  ),
  (
    'staff',
    'Funcionario operacional',
    'Perfil generico de funcionario antes de receber um cargo clinico especifico.',
    array[
      '/app','/app/profile','/app/notifications','/app/residents','/app/timeline',
      '/app/care-plan','/app/emergency','/app/caregiver','/app/academy',
      '/app/ai','/app/alerts','/app/documents','/app/inbox','/app/identity'
    ],
    true
  ),
  (
    'service_provider',
    'Prestador de servicos',
    'Acesso externo para marketplace, inbox, documentos, identidade e oportunidades.',
    array[
      '/app','/app/profile','/app/notifications','/app/marketplace','/app/documents',
      '/app/inbox','/app/identity','/app/telemedicine'
    ],
    true
  )
on conflict (role_key) do update
  set label = excluded.label,
      description = excluded.description,
      allowed_routes = excluded.allowed_routes,
      active = true,
      updated_at = now();

update public.platform_plans
set name = 'Cuidado Familiar',
    description = 'Para familiares que acompanham uma pessoa querida com rotina, memoria, documentos e alertas em um espaco seguro.',
    features = '[
      "1 residente principal",
      "Ate 5 familiares ou cuidadores convidados",
      "Linha do tempo de cuidados",
      "Memoria e legado com uploads reais",
      "Documentos privados e PDFs",
      "Alertas, inbox e telemedicina por solicitacao"
    ]'::jsonb
where stripe_price_id = 'price_future_family_monthly';

update public.platform_plans
set name = 'Clinica Pro',
    description = 'Operacao completa para clinicas, home care e equipes multidisciplinares com residentes, equipe, contratos e qualidade.',
    features = '[
      "Ate 50 residentes",
      "Ate 25 membros de equipe",
      "Plano de cuidado, timeline e documentos clinicos",
      "Aprovacoes, cargos e acessos por funcao",
      "Contratos, assinaturas e controle de cobranca",
      "Inbox, telemedicina e relatorios operacionais"
    ]'::jsonb
where stripe_price_id = 'price_future_clinic_monthly';

update public.platform_plans
set name = 'Rede de Prestadores',
    description = 'Para profissionais e empresas verificadas que desejam aparecer no marketplace e atender pelo ecossistema Care Kranich.',
    features = '[
      "Perfil no marketplace",
      "Inbox com clientes e clinicas",
      "Documentos, certificacoes e identidade facial",
      "Ate 3 membros de equipe",
      "Contratos e historico de atendimentos",
      "Preparado para pagamentos futuros via Stripe"
    ]'::jsonb
where stripe_price_id = 'price_future_provider_monthly';

update public.email_templates
set name = 'Boas-vindas calorosas',
    subject = 'Seu espaco Care Kranich esta pronto',
    preview = 'Mensagem de entrada para familias com tom premium e humano.',
    body_html = '<div style="font-family:Inter,Arial,sans-serif;color:#12382a;background:#f9f5ea;padding:32px"><img src="https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1400&q=80" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:22px"><h1 style="font-size:30px;line-height:1.15;margin:28px 0 10px">Bem-vindo ao seu circulo de cuidado</h1><p style="font-size:16px;line-height:1.7">Seu workspace foi criado para reunir rotina, documentos, memorias e conversas em um lugar calmo e seguro.</p></div>',
    image_url = 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1400&q=80'
where category = 'onboarding' and is_system = true;

update public.email_templates
set name = 'Clinica aprovada',
    subject = 'Sua clinica foi aprovada na Care Kranich',
    preview = 'Aviso de aprovacao com proximos passos reais para operacao.',
    body_html = '<div style="font-family:Inter,Arial,sans-serif;color:#12382a;background:#f5f8ef;padding:32px"><img src="https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1400&q=80" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:22px"><h1 style="font-size:30px;line-height:1.15;margin:28px 0 10px">Sua operacao foi liberada</h1><p style="font-size:16px;line-height:1.7">Agora voce pode configurar equipe, cargos, residentes, documentos e contratos com seguranca.</p></div>',
    image_url = 'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1400&q=80'
where category = 'approval' and is_system = true;

update public.email_templates
set name = 'Pagamento precisa de atencao',
    subject = 'Atualize o pagamento para manter o acesso',
    preview = 'Aviso gentil de cobranca com foco em continuidade de cuidado.',
    body_html = '<div style="font-family:Inter,Arial,sans-serif;color:#12382a;background:#fbf6ea;padding:32px"><img src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:22px"><h1 style="font-size:30px;line-height:1.15;margin:28px 0 10px">Vamos manter tudo funcionando</h1><p style="font-size:16px;line-height:1.7">Atualize seus dados de cobranca para evitar pausa de acesso ao workspace.</p></div>',
    image_url = 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80'
where category = 'billing' and is_system = true;

update public.email_templates
set name = 'Resumo semanal de cuidado',
    subject = 'Seu resumo semanal esta pronto',
    preview = 'Relatorio visual para familias e gestores.',
    body_html = '<div style="font-family:Inter,Arial,sans-serif;color:#12382a;background:#f6f8f1;padding:32px"><img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:22px"><h1 style="font-size:30px;line-height:1.15;margin:28px 0 10px">A semana em uma visao clara</h1><p style="font-size:16px;line-height:1.7">Veja alertas, documentos, registros e proximos passos do cuidado.</p></div>',
    image_url = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80'
where category = 'report' and is_system = true;
