-- Super admin account lifecycle controls.
-- Keeps account status changes behind an RPC instead of granting broad profile updates.

create or replace function public.set_profile_account_status(
  _user_id uuid,
  _account_status text,
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  final_status text := lower(trim(_account_status));
  target_profile public.profiles;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can change account status';
  end if;

  if final_status not in ('pending', 'active', 'rejected', 'suspended') then
    raise exception 'Invalid account status';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = _user_id
  for update;

  if target_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'super_admin'::public.app_role
  ) and _user_id <> auth.uid() then
    raise exception 'Super admin accounts are protected';
  end if;

  update public.profiles
  set account_status = final_status,
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  where id = _user_id;

  insert into public.audit_log (
    tenant_id,
    actor_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    target_profile.tenant_id,
    auth.uid(),
    'profile_account_status_changed',
    'profiles',
    _user_id,
    jsonb_strip_nulls(jsonb_build_object(
      'old_account_status', target_profile.account_status,
      'new_account_status', final_status,
      'note', _note
    ))
  );
end
$$;

revoke all on function public.set_profile_account_status(uuid, text, text) from public;
grant execute on function public.set_profile_account_status(uuid, text, text) to authenticated;
