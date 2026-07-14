
-- AI Agent conversations
CREATE TABLE public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  agent_key text NOT NULL,
  resident_id uuid,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversations TO authenticated;
GRANT ALL ON public.agent_conversations TO service_role;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conv read" ON public.agent_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin'::app_role,'super_admin'::app_role])));
CREATE POLICY "own conv insert" ON public.agent_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id = user_tenant(auth.uid()));
CREATE POLICY "own conv update" ON public.agent_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own conv delete" ON public.agent_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_agent_conv_updated BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_agent_conv_user ON public.agent_conversations(user_id, updated_at DESC);

-- Messages
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  reasoning text,
  confidence numeric,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg read via conv" ON public.agent_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR (c.tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin'::app_role,'super_admin'::app_role])))));
CREATE POLICY "msg insert via conv" ON public.agent_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "msg delete via conv" ON public.agent_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE INDEX idx_agent_msg_conv ON public.agent_messages(conversation_id, created_at);

-- Recommendations (agent outputs)
CREATE TABLE public.agent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_key text NOT NULL,
  resident_id uuid,
  title text NOT NULL,
  summary text NOT NULL,
  reasoning text,
  category text NOT NULL DEFAULT 'general',
  urgency text NOT NULL DEFAULT 'info',
  confidence numeric,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acted','dismissed')),
  acted_by uuid,
  acted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_recommendations TO authenticated;
GRANT ALL ON public.agent_recommendations TO service_role;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read rec" ON public.agent_recommendations FOR SELECT TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "tenant insert rec" ON public.agent_recommendations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant(auth.uid()));
CREATE POLICY "staff update rec" ON public.agent_recommendations FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['caregiver'::app_role,'nurse'::app_role,'doctor'::app_role,'clinic_admin'::app_role,'super_admin'::app_role]));
CREATE POLICY "admins delete rec" ON public.agent_recommendations FOR DELETE TO authenticated
  USING (tenant_id = user_tenant(auth.uid()) AND has_any_role(auth.uid(), ARRAY['clinic_admin'::app_role,'super_admin'::app_role]));
CREATE TRIGGER trg_agent_rec_updated BEFORE UPDATE ON public.agent_recommendations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_agent_rec_tenant ON public.agent_recommendations(tenant_id, created_at DESC);

-- Agent memory (per user + agent + optional resident)
CREATE TABLE public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  agent_key text NOT NULL,
  resident_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_key, resident_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_memory TO authenticated;
GRANT ALL ON public.agent_memory TO service_role;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mem all" ON public.agent_memory FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND tenant_id = user_tenant(auth.uid()));
CREATE TRIGGER trg_agent_mem_updated BEFORE UPDATE ON public.agent_memory FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_recommendations;
