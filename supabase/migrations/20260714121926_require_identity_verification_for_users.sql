-- Require identity verification records for every profile.

alter table public.profiles alter column verification_status set default 'pending';

update public.profiles
set user_kind = 'staff'
where id in (
  select user_id
  from public.user_roles
  where role = 'super_admin'::public.app_role
);

insert into public.identity_verifications (
  tenant_id,
  user_id,
  subject_type,
  provider,
  status,
  required,
  metadata
)
select
  tenant_id,
  id,
  case when user_kind = 'clinic' then 'company_admin' else 'person' end,
  'stripe_identity',
  case when verification_status = 'verified' then 'verified' else 'pending_provider_session' end,
  true,
  jsonb_build_object('created_by_migration', true)
from public.profiles
on conflict (user_id, provider) do nothing;

update public.profiles
set verification_status = 'pending'
where verification_status = 'not_started';

create or replace function public.review_identity_verification(
  _verification_id uuid,
  _status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  verification public.identity_verifications;
  final_status text := lower(trim(_status));
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can review identity verification';
  end if;

  if final_status not in ('verified', 'rejected', 'pending_provider_session') then
    raise exception 'Invalid verification status';
  end if;

  select *
  into verification
  from public.identity_verifications
  where id = _verification_id
  for update;

  if verification.id is null then
    raise exception 'Verification not found';
  end if;

  update public.identity_verifications
  set status = final_status,
      reviewed_by = auth.uid(),
      reviewed_at = case when final_status in ('verified', 'rejected') then now() else reviewed_at end,
      updated_at = now()
  where id = _verification_id;

  update public.profiles
  set verification_status = case
      when final_status = 'verified' then 'verified'
      when final_status = 'rejected' then 'rejected'
      else 'pending'
    end,
    updated_at = now()
  where id = verification.user_id;

  insert into public.audit_log (tenant_id, actor_id, action, target_table, target_id, metadata)
  values (
    verification.tenant_id,
    auth.uid(),
    'identity_verification_' || final_status,
    'identity_verifications',
    verification.id,
    jsonb_build_object('user_id', verification.user_id, 'provider', verification.provider)
  );
end
$$;

revoke all on function public.review_identity_verification(uuid, text) from public;
grant execute on function public.review_identity_verification(uuid, text) to authenticated;
