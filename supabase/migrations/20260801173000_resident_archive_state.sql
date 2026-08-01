alter table public.residents
  add column if not exists archived_at timestamptz;

create index if not exists idx_residents_archived_at
  on public.residents(tenant_id, archived_at, created_at desc);
