-- Essential internal audit foundation.
-- Records critical mutations without storing PHI/body snapshots in the audit metadata.

alter table public.audit_log
  add column if not exists operation text,
  add column if not exists severity text not null default 'info',
  add column if not exists source text not null default 'database_trigger';

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_tenant_created on public.audit_log(tenant_id, created_at desc);
create index if not exists idx_audit_log_target on public.audit_log(target_table, target_id);

create or replace function public.audit_essential_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id uuid;
  scoped_tenant uuid;
  actor uuid;
  safe_metadata jsonb := '{}'::jsonb;
  final_action text;
  final_severity text := 'info';
begin
  if tg_table_name = 'audit_log' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  row_id := case
    when tg_op = 'DELETE' then old.id
    else new.id
  end;

  scoped_tenant := case
    when tg_op = 'DELETE' then nullif(to_jsonb(old)->>'tenant_id', '')::uuid
    else nullif(to_jsonb(new)->>'tenant_id', '')::uuid
  end;

  actor := auth.uid();
  final_action := lower(tg_table_name || '_' || tg_op);

  if tg_table_name in ('documents', 'legacy_memories', 'identity_verifications', 'tenant_subscriptions', 'platform_approvals', 'contracts') then
    final_severity := 'sensitive';
  end if;

  if tg_op = 'UPDATE' then
    safe_metadata := jsonb_strip_nulls(jsonb_build_object(
      'old_status', to_jsonb(old)->>'status',
      'new_status', to_jsonb(new)->>'status',
      'old_account_status', to_jsonb(old)->>'account_status',
      'new_account_status', to_jsonb(new)->>'account_status',
      'old_access_status', to_jsonb(old)->>'access_status',
      'new_access_status', to_jsonb(new)->>'access_status',
      'old_verification_status', to_jsonb(old)->>'verification_status',
      'new_verification_status', to_jsonb(new)->>'verification_status'
    ));
  elsif tg_op = 'INSERT' then
    safe_metadata := jsonb_strip_nulls(jsonb_build_object(
      'status', to_jsonb(new)->>'status',
      'account_status', to_jsonb(new)->>'account_status',
      'access_status', to_jsonb(new)->>'access_status',
      'verification_status', to_jsonb(new)->>'verification_status'
    ));
  elsif tg_op = 'DELETE' then
    final_severity := 'critical';
    safe_metadata := jsonb_strip_nulls(jsonb_build_object(
      'status', to_jsonb(old)->>'status',
      'account_status', to_jsonb(old)->>'account_status',
      'access_status', to_jsonb(old)->>'access_status',
      'verification_status', to_jsonb(old)->>'verification_status'
    ));
  end if;

  insert into public.audit_log (
    tenant_id,
    actor_id,
    action,
    operation,
    severity,
    source,
    target_table,
    target_id,
    metadata
  )
  values (
    scoped_tenant,
    actor,
    final_action,
    tg_op,
    final_severity,
    'database_trigger',
    tg_table_name,
    row_id,
    safe_metadata
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

revoke all on function public.audit_essential_change() from public;

drop trigger if exists audit_tenants_changes on public.tenants;
create trigger audit_tenants_changes
after insert or update or delete on public.tenants
for each row execute function public.audit_essential_change();

drop trigger if exists audit_profiles_changes on public.profiles;
create trigger audit_profiles_changes
after insert or update or delete on public.profiles
for each row execute function public.audit_essential_change();

drop trigger if exists audit_user_roles_changes on public.user_roles;
create trigger audit_user_roles_changes
after insert or update or delete on public.user_roles
for each row execute function public.audit_essential_change();

drop trigger if exists audit_residents_changes on public.residents;
create trigger audit_residents_changes
after insert or update or delete on public.residents
for each row execute function public.audit_essential_change();

drop trigger if exists audit_care_plans_changes on public.care_plans;
create trigger audit_care_plans_changes
after insert or update or delete on public.care_plans
for each row execute function public.audit_essential_change();

drop trigger if exists audit_care_tasks_changes on public.care_tasks;
create trigger audit_care_tasks_changes
after insert or update or delete on public.care_tasks
for each row execute function public.audit_essential_change();

drop trigger if exists audit_alerts_changes on public.alerts;
create trigger audit_alerts_changes
after insert or update or delete on public.alerts
for each row execute function public.audit_essential_change();

drop trigger if exists audit_events_changes on public.events;
create trigger audit_events_changes
after insert or update or delete on public.events
for each row execute function public.audit_essential_change();

drop trigger if exists audit_platform_approvals_changes on public.platform_approvals;
create trigger audit_platform_approvals_changes
after insert or update or delete on public.platform_approvals
for each row execute function public.audit_essential_change();

drop trigger if exists audit_tenant_subscriptions_changes on public.tenant_subscriptions;
create trigger audit_tenant_subscriptions_changes
after insert or update or delete on public.tenant_subscriptions
for each row execute function public.audit_essential_change();

drop trigger if exists audit_contracts_changes on public.contracts;
create trigger audit_contracts_changes
after insert or update or delete on public.contracts
for each row execute function public.audit_essential_change();

drop trigger if exists audit_identity_verifications_changes on public.identity_verifications;
create trigger audit_identity_verifications_changes
after insert or update or delete on public.identity_verifications
for each row execute function public.audit_essential_change();

drop trigger if exists audit_documents_changes on public.documents;
create trigger audit_documents_changes
after insert or update or delete on public.documents
for each row execute function public.audit_essential_change();

drop trigger if exists audit_legacy_memories_changes on public.legacy_memories;
create trigger audit_legacy_memories_changes
after insert or update or delete on public.legacy_memories
for each row execute function public.audit_essential_change();

drop trigger if exists audit_inbox_threads_changes on public.inbox_threads;
create trigger audit_inbox_threads_changes
after insert or update or delete on public.inbox_threads
for each row execute function public.audit_essential_change();

drop trigger if exists audit_inbox_messages_changes on public.inbox_messages;
create trigger audit_inbox_messages_changes
after insert or delete on public.inbox_messages
for each row execute function public.audit_essential_change();
