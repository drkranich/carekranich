-- Global platform branding controlled by the super admin.
-- Public users can read the active logo/favicon, but only super admins can upload
-- and publish new assets.

create table if not exists public.platform_branding (
  id boolean primary key default true,
  brand_name text not null default 'Care Kranich',
  logo_url text,
  logo_path text,
  favicon_url text,
  favicon_path text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint platform_branding_singleton check (id = true)
);

insert into public.platform_branding (id, brand_name)
values (true, 'Care Kranich')
on conflict (id) do nothing;

alter table public.platform_branding enable row level security;

drop policy if exists "platform branding public read" on public.platform_branding;
drop policy if exists "platform branding super admin update" on public.platform_branding;

create policy "platform branding public read"
  on public.platform_branding
  for select
  to anon, authenticated
  using (true);

create policy "platform branding super admin update"
  on public.platform_branding
  for update
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

grant select on public.platform_branding to anon, authenticated;
grant update (brand_name, logo_url, logo_path, favicon_url, favicon_path, updated_by, updated_at)
  on public.platform_branding to authenticated;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

drop policy if exists "branding storage select super admin" on storage.objects;
drop policy if exists "branding storage insert super admin" on storage.objects;
drop policy if exists "branding storage update super admin" on storage.objects;
drop policy if exists "branding storage delete super admin" on storage.objects;

create policy "branding storage select super admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'branding'
    and public.is_super_admin(auth.uid())
  );

create policy "branding storage insert super admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'branding'
    and public.is_super_admin(auth.uid())
    and (storage.foldername(name))[1] = 'platform'
  );

create policy "branding storage update super admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'branding'
    and public.is_super_admin(auth.uid())
    and (storage.foldername(name))[1] = 'platform'
  )
  with check (
    bucket_id = 'branding'
    and public.is_super_admin(auth.uid())
    and (storage.foldername(name))[1] = 'platform'
  );

create policy "branding storage delete super admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'branding'
    and public.is_super_admin(auth.uid())
    and (storage.foldername(name))[1] = 'platform'
  );

create or replace function public.set_platform_branding(
  _brand_name text default null,
  _logo_url text default null,
  _logo_path text default null,
  _favicon_url text default null,
  _favicon_path text default null
)
returns public.platform_branding
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.platform_branding;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can update platform branding';
  end if;

  update public.platform_branding
  set brand_name = coalesce(nullif(trim(_brand_name), ''), brand_name),
      logo_url = coalesce(_logo_url, logo_url),
      logo_path = coalesce(_logo_path, logo_path),
      favicon_url = coalesce(_favicon_url, favicon_url),
      favicon_path = coalesce(_favicon_path, favicon_path),
      updated_by = auth.uid(),
      updated_at = now()
  where id = true
  returning * into updated;

  insert into public.audit_log (
    tenant_id,
    actor_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    null,
    auth.uid(),
    'platform_branding_updated',
    'platform_branding',
    null,
    jsonb_strip_nulls(jsonb_build_object(
      'brand_name', updated.brand_name,
      'logo_path', updated.logo_path,
      'favicon_path', updated.favicon_path
    ))
  );

  return updated;
end
$$;

revoke all on function public.set_platform_branding(text, text, text, text, text) from public;
grant execute on function public.set_platform_branding(text, text, text, text, text) to authenticated;
