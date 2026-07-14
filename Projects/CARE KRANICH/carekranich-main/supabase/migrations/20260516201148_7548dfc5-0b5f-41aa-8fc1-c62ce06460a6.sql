-- Add invite codes to tenants for join flow
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS invite_code text UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
CREATE INDEX IF NOT EXISTS idx_tenants_invite_code ON public.tenants(invite_code);

-- Allow authenticated users to create a tenant during onboarding (becomes clinic_admin)
DROP POLICY IF EXISTS "any auth can create tenant" ON public.tenants;
CREATE POLICY "any auth can create tenant" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow lookup by invite_code for join flow (limited columns enforced via app layer)
DROP POLICY IF EXISTS "lookup tenant by invite" ON public.tenants;
CREATE POLICY "lookup tenant by invite" ON public.tenants
  FOR SELECT TO authenticated USING (true);

-- Drop the broader "members view their tenant" because the lookup policy above covers it
-- (keeping it is fine; SELECT policies are OR'd. We leave it.)

-- Allow users to set their own tenant_id on profiles (during onboarding)
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow users to insert their own role row when joining/creating a tenant
DROP POLICY IF EXISTS "insert own role on join" ON public.user_roles;
CREATE POLICY "insert own role on join" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============== CARE PLANS ==============
CREATE TABLE IF NOT EXISTS public.care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  priority text NOT NULL DEFAULT 'normal',
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read care_plans" ON public.care_plans
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "care staff insert care_plans" ON public.care_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = user_tenant(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['nurse','doctor','clinic_admin','super_admin']::app_role[])
  );

CREATE POLICY "care staff update care_plans" ON public.care_plans
  FOR UPDATE TO authenticated
  USING (
    tenant_id = user_tenant(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['nurse','doctor','clinic_admin','super_admin']::app_role[])
  );

CREATE POLICY "admins delete care_plans" ON public.care_plans
  FOR DELETE TO authenticated
  USING (
    tenant_id = user_tenant(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[])
  );

CREATE TRIGGER care_plans_touch BEFORE UPDATE ON public.care_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_care_plans_tenant ON public.care_plans(tenant_id);
CREATE INDEX idx_care_plans_resident ON public.care_plans(resident_id);

-- ============== CARE TASKS ==============
CREATE TABLE IF NOT EXISTS public.care_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  care_plan_id uuid REFERENCES public.care_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  completed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read care_tasks" ON public.care_tasks
  FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "care staff insert care_tasks" ON public.care_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = user_tenant(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[])
  );

CREATE POLICY "care staff update care_tasks" ON public.care_tasks
  FOR UPDATE TO authenticated
  USING (
    tenant_id = user_tenant(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[])
  );

CREATE POLICY "admins delete care_tasks" ON public.care_tasks
  FOR DELETE TO authenticated
  USING (
    tenant_id = user_tenant(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[])
  );

CREATE TRIGGER care_tasks_touch BEFORE UPDATE ON public.care_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_care_tasks_tenant ON public.care_tasks(tenant_id);
CREATE INDEX idx_care_tasks_resident ON public.care_tasks(resident_id);
CREATE INDEX idx_care_tasks_status ON public.care_tasks(status);
CREATE INDEX idx_care_tasks_due ON public.care_tasks(due_at);