-- EVENTS
create table public.events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  resident_id uuid,
  actor_id uuid,
  category text not null default 'general',
  severity text not null default 'info',
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index events_tenant_occurred_idx on public.events(tenant_id, occurred_at desc);
create index events_resident_idx on public.events(resident_id);
alter table public.events enable row level security;

create policy "tenant read events" on public.events for select to authenticated
  using (tenant_id = user_tenant(auth.uid()) or has_role(auth.uid(),'super_admin'));
create policy "care staff insert events" on public.events for insert to authenticated
  with check (tenant_id = user_tenant(auth.uid()) and has_any_role(auth.uid(), array['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[]));
create policy "admins delete events" on public.events for delete to authenticated
  using (tenant_id = user_tenant(auth.uid()) and has_any_role(auth.uid(), array['clinic_admin','super_admin']::app_role[]));

-- ALERTS
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  resident_id uuid,
  category text not null default 'general',
  severity text not null default 'warning',
  status text not null default 'open',
  title text not null,
  description text,
  assigned_to uuid,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index alerts_tenant_status_idx on public.alerts(tenant_id, status, created_at desc);
alter table public.alerts enable row level security;

create policy "tenant read alerts" on public.alerts for select to authenticated
  using (tenant_id = user_tenant(auth.uid()) or has_role(auth.uid(),'super_admin'));
create policy "care staff insert alerts" on public.alerts for insert to authenticated
  with check (tenant_id = user_tenant(auth.uid()) and has_any_role(auth.uid(), array['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[]));
create policy "care staff update alerts" on public.alerts for update to authenticated
  using (tenant_id = user_tenant(auth.uid()) and has_any_role(auth.uid(), array['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[]));
create policy "admins delete alerts" on public.alerts for delete to authenticated
  using (tenant_id = user_tenant(auth.uid()) and has_any_role(auth.uid(), array['clinic_admin','super_admin']::app_role[]));

create trigger alerts_touch before update on public.alerts
  for each row execute function public.touch_updated_at();

-- NOTIFICATIONS (per-user)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  title text not null,
  body text,
  link text,
  severity text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

create policy "own notifications read" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tenant staff insert notifications" on public.notifications for insert to authenticated
  with check (tenant_id = user_tenant(auth.uid()));

-- REALTIME
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.care_tasks;