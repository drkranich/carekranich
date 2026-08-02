create table if not exists public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  quote_scope text not null default 'platform' check (quote_scope in ('platform', 'clinic')),
  title text not null,
  client_name text not null,
  client_email text,
  client_phone text,
  client_address text,
  currency text not null default 'BRL',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected', 'archived')),
  valid_until date,
  blocks jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_quotes_tenant_idx on public.service_quotes (tenant_id, created_at desc);
create index if not exists service_quotes_scope_idx on public.service_quotes (quote_scope, created_at desc);
create index if not exists service_quotes_status_idx on public.service_quotes (status);

alter table public.service_quotes enable row level security;

drop policy if exists "service quotes select scoped" on public.service_quotes;
create policy "service quotes select scoped" on public.service_quotes
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      quote_scope = 'clinic'
      and tenant_id = public.user_tenant(auth.uid())
      and public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
    )
  );

drop policy if exists "service quotes insert scoped" on public.service_quotes;
create policy "service quotes insert scoped" on public.service_quotes
  for insert to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (
      quote_scope = 'clinic'
      and tenant_id = public.user_tenant(auth.uid())
      and public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
    )
  );

drop policy if exists "service quotes update scoped" on public.service_quotes;
create policy "service quotes update scoped" on public.service_quotes
  for update to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      quote_scope = 'clinic'
      and tenant_id = public.user_tenant(auth.uid())
      and public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or (
      quote_scope = 'clinic'
      and tenant_id = public.user_tenant(auth.uid())
      and public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
    )
  );

drop policy if exists "service quotes delete scoped" on public.service_quotes;
create policy "service quotes delete scoped" on public.service_quotes
  for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      quote_scope = 'clinic'
      and tenant_id = public.user_tenant(auth.uid())
      and public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
    )
  );

drop trigger if exists service_quotes_touch on public.service_quotes;
create trigger service_quotes_touch
before update on public.service_quotes
for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.service_quotes to authenticated;
