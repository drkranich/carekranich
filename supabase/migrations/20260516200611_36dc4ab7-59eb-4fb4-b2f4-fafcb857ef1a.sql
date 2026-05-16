
-- Roles enum
create type public.app_role as enum ('family','caregiver','nurse','doctor','clinic_admin','super_admin');

-- Tenants
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  tenant_id uuid references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role, tenant_id)
);

-- Security definer role checks
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;

create or replace function public.user_tenant(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = _user_id
$$;

-- Residents
create table public.residents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  date_of_birth date,
  photo_url text,
  bio text,
  story text,
  hobbies text[],
  pronouns text,
  language text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_residents before update on public.residents
  for each row execute function public.touch_updated_at();

-- Signup hook: create profile + default family role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'family');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.residents enable row level security;

-- Tenants policies
create policy "members view their tenant" on public.tenants for select
  to authenticated using (id = public.user_tenant(auth.uid()) or public.has_role(auth.uid(),'super_admin'));
create policy "admins manage tenants" on public.tenants for all
  to authenticated using (public.has_any_role(auth.uid(), array['clinic_admin','super_admin']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['clinic_admin','super_admin']::public.app_role[]));

-- Profiles policies
create policy "own profile select" on public.profiles for select
  to authenticated using (id = auth.uid() or tenant_id = public.user_tenant(auth.uid()));
create policy "own profile update" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on public.profiles for insert
  to authenticated with check (id = auth.uid());

-- user_roles policies
create policy "view own roles" on public.user_roles for select
  to authenticated using (user_id = auth.uid() or public.has_any_role(auth.uid(), array['clinic_admin','super_admin']::public.app_role[]));
create policy "admins manage roles" on public.user_roles for all
  to authenticated using (public.has_any_role(auth.uid(), array['clinic_admin','super_admin']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['clinic_admin','super_admin']::public.app_role[]));

-- Residents policies
create policy "tenant members read residents" on public.residents for select
  to authenticated using (tenant_id = public.user_tenant(auth.uid()) or public.has_role(auth.uid(),'super_admin'));
create policy "care staff insert residents" on public.residents for insert
  to authenticated with check (
    tenant_id = public.user_tenant(auth.uid())
    and public.has_any_role(auth.uid(), array['caregiver','nurse','doctor','clinic_admin','super_admin']::public.app_role[])
  );
create policy "care staff update residents" on public.residents for update
  to authenticated using (
    tenant_id = public.user_tenant(auth.uid())
    and public.has_any_role(auth.uid(), array['caregiver','nurse','doctor','clinic_admin','super_admin']::public.app_role[])
  );
create policy "care staff delete residents" on public.residents for delete
  to authenticated using (
    tenant_id = public.user_tenant(auth.uid())
    and public.has_any_role(auth.uid(), array['clinic_admin','super_admin']::public.app_role[])
  );
