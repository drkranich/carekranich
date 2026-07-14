-- Platform control plane, approval workflow, private uploads and safer tenant RBAC.

alter table public.tenants
  add column if not exists status text not null default 'active',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists billing_status text not null default 'active',
  add column if not exists stripe_customer_id text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

alter table public.tenants alter column status set default 'pending';
alter table public.tenants alter column billing_status set default 'trialing';

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists user_kind text not null default 'family',
  add column if not exists verification_status text not null default 'not_started',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.profiles alter column account_status set default 'pending';

create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'super_admin'::public.app_role
  )
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
      from public.user_roles
      where user_id = _user_id
        and tenant_id = _tenant_id
        and role = any(_roles)
    )
$$;

create or replace function public.can_manage_tenant(_user_id uuid, _tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin(_user_id)
    or exists (
      select 1
      from public.user_roles
      where user_id = _user_id
        and tenant_id = _tenant_id
        and role = 'clinic_admin'::public.app_role
    )
$$;

revoke all on function public.is_super_admin(uuid) from public;
revoke all on function public.has_tenant_role(uuid, uuid, public.app_role[]) from public;
revoke all on function public.can_manage_tenant(uuid, uuid) from public;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.can_manage_tenant(uuid, uuid) to authenticated;

create table if not exists public.platform_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  requested_role public.app_role,
  target_table text,
  target_id uuid,
  status text not null default 'pending',
  note text,
  payload jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience text not null default 'clinic',
  description text,
  stripe_product_id text,
  stripe_price_id text unique,
  currency text not null default 'usd',
  unit_amount integer not null default 0,
  interval text not null default 'month',
  seat_limit integer,
  resident_limit integer,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid references public.platform_plans(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'trialing',
  access_status text not null default 'active',
  current_period_end timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  plan_id uuid references public.platform_plans(id) on delete set null,
  subscription_id uuid references public.tenant_subscriptions(id) on delete set null,
  title text not null,
  contract_type text not null default 'subscription',
  status text not null default 'draft',
  body text not null default '',
  pdf_path text,
  starts_at date,
  ends_at date,
  signed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbox_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  subject text not null,
  source text not null default 'saas',
  status text not null default 'open',
  priority text not null default 'normal',
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  participant_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inbox_threads(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_label text,
  body text not null,
  channel text not null default 'in_app',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  subject text not null,
  preview text,
  body_html text not null,
  image_url text,
  category text not null default 'general',
  is_system boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  template_id uuid references public.email_templates(id) on delete set null,
  name text not null,
  audience text not null default 'all_users',
  status text not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null default 'person',
  provider text not null default 'stripe_identity',
  provider_session_id text,
  status text not null default 'not_started',
  required boolean not null default true,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  title text not null,
  document_type text not null default 'general',
  bucket text not null default 'documents',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  ai_summary text,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create table if not exists public.address_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  label text,
  address text not null,
  city text,
  state text,
  country text,
  country_code text,
  postal_code text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  provider text not null default 'openstreetmap',
  raw jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, label)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

create or replace function public.request_join_by_invite(_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant public.tenants;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_tenant
  from public.tenants
  where invite_code = trim(_invite_code)
    and status = 'active'
  limit 1;

  if target_tenant.id is null then
    raise exception 'Invalid invite code';
  end if;

  update public.profiles
  set tenant_id = target_tenant.id,
      account_status = 'pending',
      updated_at = now()
  where id = auth.uid();

  insert into public.platform_approvals (
    tenant_id,
    requested_by,
    request_type,
    requested_role,
    target_table,
    target_id,
    note,
    payload
  )
  values (
    target_tenant.id,
    auth.uid(),
    'user_join',
    'family'::public.app_role,
    'profiles',
    auth.uid(),
    'User requested access with invite code.',
    jsonb_build_object('tenant_name', target_tenant.name)
  )
  returning id into request_id;

  return request_id;
end
$$;

revoke all on function public.request_join_by_invite(text) from public;
grant execute on function public.request_join_by_invite(text) to authenticated;

create or replace function public.request_new_tenant(
  _name text,
  _slug text,
  _user_kind text default 'clinic',
  _address jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  request_id uuid;
  requested public.app_role := 'clinic_admin'::public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(coalesce(_name, ''))) < 2 then
    raise exception 'Organization name is required';
  end if;

  if coalesce(_user_kind, 'clinic') = 'family' then
    requested := 'family'::public.app_role;
  end if;

  insert into public.tenants (name, slug, status, billing_status, created_by)
  values (trim(_name), trim(_slug), 'pending', 'pending_approval', auth.uid())
  returning id into new_tenant_id;

  update public.profiles
  set tenant_id = new_tenant_id,
      account_status = 'pending',
      user_kind = coalesce(_user_kind, 'clinic'),
      updated_at = now()
  where id = auth.uid();

  if coalesce(_address->>'address', '') <> '' then
    insert into public.address_locations (
      tenant_id,
      entity_type,
      entity_id,
      label,
      address,
      city,
      state,
      country,
      country_code,
      postal_code,
      latitude,
      longitude,
      raw,
      created_by
    )
    values (
      new_tenant_id,
      'tenant',
      new_tenant_id,
      'primary',
      _address->>'address',
      _address->>'city',
      _address->>'state',
      _address->>'country',
      _address->>'country_code',
      _address->>'postal_code',
      nullif(_address->>'latitude', '')::numeric,
      nullif(_address->>'longitude', '')::numeric,
      _address,
      auth.uid()
    )
    on conflict (entity_type, entity_id, label) do update
      set address = excluded.address,
          city = excluded.city,
          state = excluded.state,
          country = excluded.country,
          country_code = excluded.country_code,
          postal_code = excluded.postal_code,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          raw = excluded.raw,
          updated_at = now();
  end if;

  insert into public.platform_approvals (
    tenant_id,
    requested_by,
    request_type,
    requested_role,
    target_table,
    target_id,
    note,
    payload
  )
  values (
    new_tenant_id,
    auth.uid(),
    'tenant_signup',
    requested,
    'tenants',
    new_tenant_id,
    'New organization requested approval.',
    jsonb_build_object('tenant_name', trim(_name), 'user_kind', coalesce(_user_kind, 'clinic'), 'address', _address)
  )
  returning id into request_id;

  return request_id;
end
$$;

revoke all on function public.request_new_tenant(text, text, text, jsonb) from public;
grant execute on function public.request_new_tenant(text, text, text, jsonb) to authenticated;

create or replace function public.review_platform_approval(
  _approval_id uuid,
  _status text,
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  approval public.platform_approvals;
  final_status text := lower(trim(_status));
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can review platform approvals';
  end if;

  if final_status not in ('approved', 'rejected') then
    raise exception 'Approval status must be approved or rejected';
  end if;

  select *
  into approval
  from public.platform_approvals
  where id = _approval_id
  for update;

  if approval.id is null then
    raise exception 'Approval request not found';
  end if;

  update public.platform_approvals
  set status = final_status,
      note = coalesce(_note, note),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = _approval_id;

  if final_status = 'approved' then
    if approval.tenant_id is not null then
      update public.tenants
      set status = 'active',
          billing_status = case when billing_status = 'pending_approval' then 'trialing' else billing_status end,
          approved_by = auth.uid(),
          approved_at = now()
      where id = approval.tenant_id;
    end if;

    update public.profiles
    set tenant_id = coalesce(approval.tenant_id, tenant_id),
        account_status = 'active',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    where id = approval.requested_by;

    if approval.requested_role is not null then
      insert into public.user_roles (user_id, role, tenant_id)
      values (approval.requested_by, approval.requested_role, approval.tenant_id)
      on conflict do nothing;
    end if;
  else
    update public.profiles
    set account_status = 'rejected',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    where id = approval.requested_by;

    if approval.request_type = 'tenant_signup' and approval.tenant_id is not null then
      update public.tenants
      set status = 'rejected',
          approved_by = auth.uid(),
          approved_at = now()
      where id = approval.tenant_id;
    end if;
  end if;

  insert into public.audit_log (tenant_id, actor_id, action, target_table, target_id, metadata)
  values (
    approval.tenant_id,
    auth.uid(),
    'platform_approval_' || final_status,
    approval.target_table,
    approval.target_id,
    jsonb_build_object('approval_id', approval.id, 'request_type', approval.request_type)
  );
end
$$;

revoke all on function public.review_platform_approval(uuid, text, text) from public;
grant execute on function public.review_platform_approval(uuid, text, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
  status_value text;
begin
  assigned_role := case
    when lower(new.email) = 'carekranich@gmail.com' then 'super_admin'::public.app_role
    else 'family'::public.app_role
  end;

  status_value := case
    when lower(new.email) = 'carekranich@gmail.com' then 'active'
    else 'pending'
  end;

  insert into public.profiles (id, full_name, preferred_name, account_status, user_kind)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'preferred_name', split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1)),
    status_value,
    coalesce(new.raw_user_meta_data->>'user_kind', 'family')
  )
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        preferred_name = coalesce(public.profiles.preferred_name, excluded.preferred_name);

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role)
  on conflict do nothing;

  return new;
end
$$;

drop policy if exists "any auth can create tenant" on public.tenants;
drop policy if exists "lookup tenant by invite" on public.tenants;
drop policy if exists "members view their tenant" on public.tenants;
drop policy if exists "admins manage tenants" on public.tenants;
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "view own roles" on public.user_roles;
drop policy if exists "admins manage roles" on public.user_roles;
drop policy if exists "insert own role on join" on public.user_roles;

create policy "tenant scoped select" on public.tenants
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or id = public.user_tenant(auth.uid())
    or created_by = auth.uid()
  );

create policy "pending tenant request insert" on public.tenants
  for insert to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (created_by = auth.uid() and status = 'pending')
  );

create policy "super admin manage tenants" on public.tenants
  for update to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create policy "own and tenant profiles select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin(auth.uid())
    or public.can_manage_tenant(auth.uid(), tenant_id)
  );

create policy "own profile update safe fields" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_super_admin(auth.uid()))
  with check (id = auth.uid() or public.is_super_admin(auth.uid()));

create policy "roles scoped select" on public.user_roles
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or public.can_manage_tenant(auth.uid(), tenant_id)
  );

create policy "roles scoped insert" on public.user_roles
  for insert to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (
      public.can_manage_tenant(auth.uid(), tenant_id)
      and role <> 'super_admin'::public.app_role
    )
  );

create policy "roles scoped delete" on public.user_roles
  for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      public.can_manage_tenant(auth.uid(), tenant_id)
      and role <> 'super_admin'::public.app_role
    )
  );

alter table public.platform_approvals enable row level security;
alter table public.platform_plans enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.contracts enable row level security;
alter table public.inbox_threads enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.documents enable row level security;
alter table public.address_locations enable row level security;
alter table public.audit_log enable row level security;

create policy "approvals select scoped" on public.platform_approvals for select to authenticated
  using (requested_by = auth.uid() or public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));
create policy "approvals insert own" on public.platform_approvals for insert to authenticated
  with check (requested_by = auth.uid() or public.is_super_admin(auth.uid()));
create policy "approvals super update" on public.platform_approvals for update to authenticated
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

create policy "plans read active" on public.platform_plans for select to authenticated
  using (active = true or public.is_super_admin(auth.uid()));
create policy "plans super manage" on public.platform_plans for all to authenticated
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

create policy "subscriptions select scoped" on public.tenant_subscriptions for select to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));
create policy "subscriptions super manage" on public.tenant_subscriptions for all to authenticated
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

create policy "contracts select scoped" on public.contracts for select to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or user_id = auth.uid());
create policy "contracts manage scoped" on public.contracts for all to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id))
  with check (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));

create policy "threads select scoped" on public.inbox_threads for select to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or created_by = auth.uid() or participant_user_id = auth.uid());
create policy "threads insert scoped" on public.inbox_threads for insert to authenticated
  with check (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or created_by = auth.uid());
create policy "threads update scoped" on public.inbox_threads for update to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id) or created_by = auth.uid())
  with check (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id) or created_by = auth.uid());

create policy "messages select via thread" on public.inbox_messages for select to authenticated
  using (exists (
    select 1 from public.inbox_threads t
    where t.id = thread_id
      and (public.is_super_admin(auth.uid()) or t.tenant_id = public.user_tenant(auth.uid()) or t.created_by = auth.uid() or t.participant_user_id = auth.uid())
  ));
create policy "messages insert via thread" on public.inbox_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.inbox_threads t
    where t.id = thread_id
      and (public.is_super_admin(auth.uid()) or t.tenant_id = public.user_tenant(auth.uid()) or t.created_by = auth.uid() or t.participant_user_id = auth.uid())
  ));

create policy "templates select scoped" on public.email_templates for select to authenticated
  using ((is_system and active) or public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()));
create policy "templates manage scoped" on public.email_templates for all to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id))
  with check (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));

create policy "campaigns select scoped" on public.email_campaigns for select to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));
create policy "campaigns manage scoped" on public.email_campaigns for all to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id))
  with check (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));

create policy "identity select scoped" on public.identity_verifications for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));
create policy "identity insert own" on public.identity_verifications for insert to authenticated
  with check (user_id = auth.uid() or public.is_super_admin(auth.uid()));
create policy "identity super update" on public.identity_verifications for update to authenticated
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

create policy "documents select scoped" on public.documents for select to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or owner_id = auth.uid());
create policy "documents insert scoped" on public.documents for insert to authenticated
  with check (public.is_super_admin(auth.uid()) or (tenant_id = public.user_tenant(auth.uid()) and uploaded_by = auth.uid()));
create policy "documents update scoped" on public.documents for update to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id) or uploaded_by = auth.uid())
  with check (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id) or uploaded_by = auth.uid());
create policy "documents delete scoped" on public.documents for delete to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id) or uploaded_by = auth.uid());

create policy "locations select scoped" on public.address_locations for select to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or created_by = auth.uid());
create policy "locations manage scoped" on public.address_locations for all to authenticated
  using (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or created_by = auth.uid())
  with check (public.is_super_admin(auth.uid()) or tenant_id = public.user_tenant(auth.uid()) or created_by = auth.uid());

create policy "audit super select" on public.audit_log for select to authenticated
  using (public.is_super_admin(auth.uid()) or public.can_manage_tenant(auth.uid(), tenant_id));
create policy "audit insert own" on public.audit_log for insert to authenticated
  with check (actor_id = auth.uid() or public.is_super_admin(auth.uid()));

drop policy if exists "documents storage select scoped" on storage.objects;
drop policy if exists "documents storage insert scoped" on storage.objects;
drop policy if exists "documents storage update scoped" on storage.objects;
drop policy if exists "documents storage delete scoped" on storage.objects;

create policy "documents storage select scoped" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.is_super_admin(auth.uid())
      or (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
    )
  );
create policy "documents storage insert scoped" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (
      public.is_super_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
create policy "documents storage update scoped" on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.is_super_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
create policy "documents storage delete scoped" on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.is_super_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = public.user_tenant(auth.uid())::text
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create trigger platform_approvals_touch before update on public.platform_approvals for each row execute function public.touch_updated_at();
create trigger platform_plans_touch before update on public.platform_plans for each row execute function public.touch_updated_at();
create trigger tenant_subscriptions_touch before update on public.tenant_subscriptions for each row execute function public.touch_updated_at();
create trigger contracts_touch before update on public.contracts for each row execute function public.touch_updated_at();
create trigger inbox_threads_touch before update on public.inbox_threads for each row execute function public.touch_updated_at();
create trigger email_templates_touch before update on public.email_templates for each row execute function public.touch_updated_at();
create trigger email_campaigns_touch before update on public.email_campaigns for each row execute function public.touch_updated_at();
create trigger identity_verifications_touch before update on public.identity_verifications for each row execute function public.touch_updated_at();
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();
create trigger address_locations_touch before update on public.address_locations for each row execute function public.touch_updated_at();

create index if not exists idx_platform_approvals_status on public.platform_approvals(status, created_at desc);
create index if not exists idx_platform_approvals_tenant on public.platform_approvals(tenant_id);
create index if not exists idx_subscriptions_tenant on public.tenant_subscriptions(tenant_id);
create index if not exists idx_contracts_tenant on public.contracts(tenant_id);
create index if not exists idx_threads_tenant_status on public.inbox_threads(tenant_id, status);
create index if not exists idx_messages_thread on public.inbox_messages(thread_id, created_at);
create index if not exists idx_documents_tenant on public.documents(tenant_id, created_at desc);
create index if not exists idx_identity_user on public.identity_verifications(user_id);
create index if not exists idx_locations_entity on public.address_locations(entity_type, entity_id);

grant select, insert, update, delete on
  public.platform_approvals,
  public.platform_plans,
  public.tenant_subscriptions,
  public.contracts,
  public.inbox_threads,
  public.inbox_messages,
  public.email_templates,
  public.email_campaigns,
  public.identity_verifications,
  public.documents,
  public.address_locations,
  public.audit_log
to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name, preferred_name, avatar_url, time_zone, phone) on public.profiles to authenticated;

insert into public.platform_plans (name, audience, description, stripe_price_id, currency, unit_amount, interval, resident_limit, seat_limit, features, active)
values
  ('Family Care', 'family', 'Care workspace for one loved one and the family circle.', 'price_future_family_monthly', 'usd', 4900, 'month', 1, 5, '["family hub","timeline","documents","ai summaries"]'::jsonb, true),
  ('Clinic Pro', 'clinic', 'Clinical operations, staff workflow, resident intelligence and approvals.', 'price_future_clinic_monthly', 'usd', 19900, 'month', 50, 25, '["residents","care plans","inbox","contracts","analytics"]'::jsonb, true),
  ('Provider Network', 'service_provider', 'Marketplace listing and service delivery workspace for verified health providers.', 'price_future_provider_monthly', 'usd', 9900, 'month', null, 3, '["marketplace listing","inbox","documents","identity verification"]'::jsonb, true)
on conflict (stripe_price_id) do update
  set name = excluded.name,
      audience = excluded.audience,
      description = excluded.description,
      unit_amount = excluded.unit_amount,
      features = excluded.features,
      active = true;

insert into public.email_templates (name, subject, preview, body_html, image_url, category, is_system)
values
  ('Welcome family', 'Welcome to Care Kranich', 'A calm first message for family onboarding.', '<h1>Welcome to your care circle</h1><p>Your workspace is ready. Add your loved one, invite trusted people and keep every update in one place.</p>', 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=1200&q=80', 'onboarding', true),
  ('Clinic approval', 'Your Care Kranich clinic workspace was approved', 'Approval notice for clinics and agencies.', '<h1>Your clinic is approved</h1><p>You can now invite staff, configure plans and start coordinating care securely.</p>', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80', 'approval', true),
  ('Payment issue', 'Action needed: payment update', 'Gentle dunning email for failed payment.', '<h1>Payment needs attention</h1><p>Please update your billing details to keep access uninterrupted.</p>', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80', 'billing', true),
  ('Care report', 'Your weekly care summary is ready', 'Weekly report for families.', '<h1>Your weekly care summary</h1><p>Review routines, alerts, documents and the latest notes from the care team.</p>', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80', 'report', true)
on conflict do nothing;
