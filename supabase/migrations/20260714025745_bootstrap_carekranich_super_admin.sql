-- Keep the platform owner account as the global super admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
begin
  assigned_role := case
    when lower(new.email) = 'carekranich@gmail.com' then 'super_admin'::public.app_role
    else 'family'::public.app_role
  end;

  insert into public.profiles (id, full_name, preferred_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'preferred_name', split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1))
  );

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role);

  return new;
end $$;

with target_user as (
  select id, email
  from auth.users
  where lower(email) = 'carekranich@gmail.com'
), ensure_profile as (
  insert into public.profiles (id, full_name, preferred_name)
  select id, coalesce(email, 'Care Kranich'), split_part(coalesce(email, 'Care Kranich'), '@', 1)
  from target_user
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        preferred_name = coalesce(public.profiles.preferred_name, excluded.preferred_name)
  returning id
), remove_default_family_role as (
  delete from public.user_roles ur
  using target_user tu
  where ur.user_id = tu.id
    and ur.role = 'family'::public.app_role
    and ur.tenant_id is null
  returning ur.user_id
)
insert into public.user_roles (user_id, role, tenant_id)
select tu.id, 'super_admin'::public.app_role, null
from target_user tu
where not exists (
  select 1
  from public.user_roles ur
  where ur.user_id = tu.id
    and ur.role = 'super_admin'::public.app_role
);
