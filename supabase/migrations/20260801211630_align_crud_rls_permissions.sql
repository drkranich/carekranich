-- Align CRUD permissions with the SaaS product model:
-- super admin can manage all rows, tenant admins can manage tenant rows,
-- and creators can manage their own operational records.

alter table public.alerts
  add column if not exists archived_at timestamptz;

create index if not exists alerts_tenant_archived_idx
  on public.alerts(tenant_id, archived_at, created_at desc);

grant select, insert, update, delete on public.alerts to authenticated;
grant select, insert, update, delete on public.twin_observations to authenticated;

drop policy if exists "tenant read alerts" on public.alerts;
drop policy if exists "care staff insert alerts" on public.alerts;
drop policy if exists "care staff update alerts" on public.alerts;
drop policy if exists "admins delete alerts" on public.alerts;
drop policy if exists "alerts select scoped" on public.alerts;
drop policy if exists "alerts insert scoped" on public.alerts;
drop policy if exists "alerts update scoped" on public.alerts;
drop policy if exists "alerts delete scoped" on public.alerts;

create policy "alerts select scoped" on public.alerts
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or tenant_id = public.user_tenant(auth.uid())
  );

create policy "alerts insert scoped" on public.alerts
  for insert to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (
      tenant_id = public.user_tenant(auth.uid())
      and public.has_any_role(
        auth.uid(),
        array['family','caregiver','nurse','doctor','clinic_admin']::public.app_role[]
      )
    )
  );

create policy "alerts update scoped" on public.alerts
  for update to authenticated
  using (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or public.has_tenant_role(
      auth.uid(),
      tenant_id,
      array['clinic_admin','doctor','nurse','caregiver']::public.app_role[]
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or public.has_tenant_role(
      auth.uid(),
      tenant_id,
      array['clinic_admin','doctor','nurse','caregiver']::public.app_role[]
    )
  );

create policy "alerts delete scoped" on public.alerts
  for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
  );

drop policy if exists "tenant read twin_observations" on public.twin_observations;
drop policy if exists "staff insert twin_observations" on public.twin_observations;
drop policy if exists "admins update twin_observations" on public.twin_observations;
drop policy if exists "admins delete twin_observations" on public.twin_observations;
drop policy if exists "twin observations select scoped" on public.twin_observations;
drop policy if exists "twin observations insert scoped" on public.twin_observations;
drop policy if exists "twin observations update scoped" on public.twin_observations;
drop policy if exists "twin observations delete scoped" on public.twin_observations;

create policy "twin observations select scoped" on public.twin_observations
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or tenant_id = public.user_tenant(auth.uid())
  );

create policy "twin observations insert scoped" on public.twin_observations
  for insert to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (
      tenant_id = public.user_tenant(auth.uid())
      and public.has_any_role(
        auth.uid(),
        array['family','caregiver','nurse','doctor','clinic_admin']::public.app_role[]
      )
    )
  );

create policy "twin observations update scoped" on public.twin_observations
  for update to authenticated
  using (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or public.has_tenant_role(
      auth.uid(),
      tenant_id,
      array['clinic_admin','doctor','nurse','caregiver']::public.app_role[]
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or public.has_tenant_role(
      auth.uid(),
      tenant_id,
      array['clinic_admin','doctor','nurse','caregiver']::public.app_role[]
    )
  );

create policy "twin observations delete scoped" on public.twin_observations
  for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or created_by = auth.uid()
    or public.has_tenant_role(auth.uid(), tenant_id, array['clinic_admin']::public.app_role[])
  );
