-- Tenant operational access controls.
-- Suspended/rejected/payment-blocked organizations should not keep reading tenant data through RLS.

create or replace function public.user_tenant(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_id
  from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.id = _user_id
    and p.account_status = 'active'
    and t.status = 'active'
    and coalesce(t.billing_status, 'active') not in ('revoked', 'suspended')
  limit 1
$$;

create or replace function public.has_tenant_role(
  _user_id uuid,
  _tenant_id uuid,
  _roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin(_user_id)
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      join public.tenants t on t.id = ur.tenant_id
      where ur.user_id = _user_id
        and ur.tenant_id = _tenant_id
        and ur.role = any(_roles)
        and p.account_status = 'active'
        and t.status = 'active'
        and coalesce(t.billing_status, 'active') not in ('revoked', 'suspended')
    )
$$;

create or replace function public.can_manage_tenant(_user_id uuid, _tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_tenant_role(
    _user_id,
    _tenant_id,
    array['clinic_admin', 'super_admin']::public.app_role[]
  )
$$;

revoke all on function public.user_tenant(uuid) from public;
revoke all on function public.has_tenant_role(uuid, uuid, public.app_role[]) from public;
revoke all on function public.can_manage_tenant(uuid, uuid) from public;
grant execute on function public.user_tenant(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.can_manage_tenant(uuid, uuid) to authenticated;

create or replace function public.current_tenant_access()
returns table (
  id uuid,
  name text,
  status text,
  billing_status text,
  suspended_reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.status,
    t.billing_status,
    t.suspended_reason
  from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.id = auth.uid()
  limit 1
$$;

revoke all on function public.current_tenant_access() from public;
grant execute on function public.current_tenant_access() to authenticated;

create or replace function public.set_tenant_operational_status(
  _tenant_id uuid,
  _status text,
  _billing_status text default null,
  _reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  final_status text := lower(trim(_status));
  final_billing text := nullif(lower(trim(coalesce(_billing_status, ''))), '');
  target_tenant public.tenants;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can change tenant operational status';
  end if;

  if final_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'Invalid tenant status';
  end if;

  if final_billing is not null
    and final_billing not in ('pending_approval', 'trialing', 'active', 'past_due', 'revoked', 'suspended') then
    raise exception 'Invalid billing status';
  end if;

  select *
  into target_tenant
  from public.tenants
  where id = _tenant_id
  for update;

  if target_tenant.id is null then
    raise exception 'Tenant not found';
  end if;

  update public.tenants
  set status = final_status,
      billing_status = coalesce(final_billing, billing_status),
      suspended_at = case
        when final_status = 'suspended' or coalesce(final_billing, billing_status) in ('revoked', 'suspended') then now()
        when final_status = 'active' and coalesce(final_billing, billing_status) not in ('revoked', 'suspended') then null
        else suspended_at
      end,
      suspended_reason = case
        when final_status = 'suspended' or coalesce(final_billing, billing_status) in ('revoked', 'suspended') then _reason
        when final_status = 'active' and coalesce(final_billing, billing_status) not in ('revoked', 'suspended') then null
        else suspended_reason
      end,
      approved_by = auth.uid(),
      approved_at = case when final_status = 'active' then now() else approved_at end
  where id = _tenant_id;

  insert into public.audit_log (
    tenant_id,
    actor_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    _tenant_id,
    auth.uid(),
    'tenant_operational_status_changed',
    'tenants',
    _tenant_id,
    jsonb_strip_nulls(jsonb_build_object(
      'old_status', target_tenant.status,
      'new_status', final_status,
      'old_billing_status', target_tenant.billing_status,
      'new_billing_status', coalesce(final_billing, target_tenant.billing_status),
      'reason', _reason
    ))
  );
end
$$;

revoke all on function public.set_tenant_operational_status(uuid, text, text, text) from public;
grant execute on function public.set_tenant_operational_status(uuid, text, text, text) to authenticated;
