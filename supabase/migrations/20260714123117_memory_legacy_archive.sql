-- Real memory and legacy archive with private Supabase Storage.

create table if not exists public.legacy_memories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  title text not null,
  memory_type text not null default 'photo',
  memory_date date,
  memory_year integer,
  description text,
  prompt text,
  visibility text not null default 'private',
  bucket text not null default 'memories',
  storage_path text,
  mime_type text,
  file_size bigint,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do update set public = false;

alter table public.legacy_memories enable row level security;

drop policy if exists "legacy memories select scoped" on public.legacy_memories;
drop policy if exists "legacy memories insert scoped" on public.legacy_memories;
drop policy if exists "legacy memories update scoped" on public.legacy_memories;
drop policy if exists "legacy memories delete scoped" on public.legacy_memories;

create policy "legacy memories select scoped" on public.legacy_memories for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or tenant_id = public.user_tenant(auth.uid())
    or owner_id = auth.uid()
    or uploaded_by = auth.uid()
  );

create policy "legacy memories insert scoped" on public.legacy_memories for insert to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (
      tenant_id = public.user_tenant(auth.uid())
      and coalesce(owner_id, auth.uid()) = auth.uid()
      and uploaded_by = auth.uid()
    )
  );

create policy "legacy memories update scoped" on public.legacy_memories for update to authenticated
  using (
    public.is_super_admin(auth.uid())
    or public.can_manage_tenant(auth.uid(), tenant_id)
    or owner_id = auth.uid()
    or uploaded_by = auth.uid()
  )
  with check (
    public.is_super_admin(auth.uid())
    or public.can_manage_tenant(auth.uid(), tenant_id)
    or owner_id = auth.uid()
    or uploaded_by = auth.uid()
  );

create policy "legacy memories delete scoped" on public.legacy_memories for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or public.can_manage_tenant(auth.uid(), tenant_id)
    or owner_id = auth.uid()
    or uploaded_by = auth.uid()
  );

drop policy if exists "memories storage select scoped" on storage.objects;
drop policy if exists "memories storage insert scoped" on storage.objects;
drop policy if exists "memories storage update scoped" on storage.objects;
drop policy if exists "memories storage delete scoped" on storage.objects;

create policy "memories storage select scoped" on storage.objects for select to authenticated
  using (
    bucket_id = 'memories'
    and (
      public.is_super_admin(auth.uid())
      or (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

create policy "memories storage insert scoped" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'memories'
    and (
      public.is_super_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "memories storage update scoped" on storage.objects for update to authenticated
  using (
    bucket_id = 'memories'
    and (
      public.is_super_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "memories storage delete scoped" on storage.objects for delete to authenticated
  using (
    bucket_id = 'memories'
    and (
      public.is_super_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

drop trigger if exists legacy_memories_touch on public.legacy_memories;
create trigger legacy_memories_touch before update on public.legacy_memories
  for each row execute function public.touch_updated_at();

create index if not exists idx_legacy_memories_tenant on public.legacy_memories(tenant_id, created_at desc);
create index if not exists idx_legacy_memories_resident on public.legacy_memories(resident_id, created_at desc);
create index if not exists idx_legacy_memories_owner on public.legacy_memories(owner_id, created_at desc);

grant select, insert, update, delete on public.legacy_memories to authenticated;
