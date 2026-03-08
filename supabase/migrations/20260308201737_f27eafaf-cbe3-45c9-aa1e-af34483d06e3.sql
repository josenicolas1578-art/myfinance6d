CREATE TABLE public.custom_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents" ON public.custom_agents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agents" ON public.custom_agents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON public.custom_agents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);