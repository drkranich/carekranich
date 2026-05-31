
-- ============= twin_observations =============
CREATE TABLE public.twin_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  domain text NOT NULL CHECK (domain IN ('health','emotional','cognitive','mobility','hydration','sleep','medication','social','behavior','environment','routine')),
  metric text NOT NULL,
  value_numeric numeric,
  value_text text,
  unit text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','caregiver','nurse','doctor','ai','device','family')),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  notes text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_twin_obs_resident ON public.twin_observations(resident_id, observed_at DESC);
CREATE INDEX idx_twin_obs_tenant_domain ON public.twin_observations(tenant_id, domain, observed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_observations TO authenticated;
GRANT ALL ON public.twin_observations TO service_role;
ALTER TABLE public.twin_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read twin_observations" ON public.twin_observations FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "staff insert twin_observations" ON public.twin_observations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins update twin_observations" ON public.twin_observations FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins delete twin_observations" ON public.twin_observations FOR DELETE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));

CREATE TRIGGER trg_twin_obs_updated BEFORE UPDATE ON public.twin_observations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= cognitive_assessments =============
CREATE TABLE public.cognitive_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  memory_score integer CHECK (memory_score BETWEEN 0 AND 100),
  attention_score integer CHECK (attention_score BETWEEN 0 AND 100),
  language_score integer CHECK (language_score BETWEEN 0 AND 100),
  reasoning_score integer CHECK (reasoning_score BETWEEN 0 AND 100),
  executive_score integer CHECK (executive_score BETWEEN 0 AND 100),
  emotional_stability_score integer CHECK (emotional_stability_score BETWEEN 0 AND 100),
  vitality_score integer CHECK (vitality_score BETWEEN 0 AND 100),
  assessor_role text NOT NULL DEFAULT 'caregiver',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','caregiver','nurse','doctor','ai','assessment')),
  notes text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cog_resident ON public.cognitive_assessments(resident_id, assessed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cognitive_assessments TO authenticated;
GRANT ALL ON public.cognitive_assessments TO service_role;
ALTER TABLE public.cognitive_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read cognitive_assessments" ON public.cognitive_assessments FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "staff insert cognitive_assessments" ON public.cognitive_assessments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['nurse','doctor','clinic_admin','super_admin','caregiver']::app_role[]));
CREATE POLICY "admins update cognitive_assessments" ON public.cognitive_assessments FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins delete cognitive_assessments" ON public.cognitive_assessments FOR DELETE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));

CREATE TRIGGER trg_cog_updated BEFORE UPDATE ON public.cognitive_assessments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= longevity_scores =============
CREATE TABLE public.longevity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  longevity_score integer CHECK (longevity_score BETWEEN 0 AND 100),
  resilience_score integer CHECK (resilience_score BETWEEN 0 AND 100),
  health_score integer CHECK (health_score BETWEEN 0 AND 100),
  mobility_score integer CHECK (mobility_score BETWEEN 0 AND 100),
  cognitive_score integer CHECK (cognitive_score BETWEEN 0 AND 100),
  emotional_score integer CHECK (emotional_score BETWEEN 0 AND 100),
  social_score integer CHECK (social_score BETWEEN 0 AND 100),
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  protective_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  methodology jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_long_resident ON public.longevity_scores(resident_id, computed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.longevity_scores TO authenticated;
GRANT ALL ON public.longevity_scores TO service_role;
ALTER TABLE public.longevity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read longevity_scores" ON public.longevity_scores FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "staff insert longevity_scores" ON public.longevity_scores FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins manage longevity_scores" ON public.longevity_scores FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins delete longevity_scores" ON public.longevity_scores FOR DELETE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));

-- ============= ai_insights =============
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  resident_id uuid,
  module text NOT NULL CHECK (module IN ('digital_twin','cognitive','longevity','behavior','health_trajectory')),
  title text NOT NULL,
  summary text NOT NULL,
  reasoning text,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','positive','warning','critical')),
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_insights_resident ON public.ai_insights(resident_id, created_at DESC);
CREATE INDEX idx_ai_insights_module ON public.ai_insights(tenant_id, module, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read ai_insights" ON public.ai_insights FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "staff insert ai_insights" ON public.ai_insights FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['caregiver','nurse','doctor','clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins manage ai_insights" ON public.ai_insights FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));
CREATE POLICY "admins delete ai_insights" ON public.ai_insights FOR DELETE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin','super_admin']::app_role[]));

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.twin_observations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cognitive_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.longevity_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights;
