
CREATE TABLE public.ia_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ia messages" ON public.ia_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ia messages" ON public.ia_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ia messages" ON public.ia_messages FOR DELETE USING (auth.uid() = user_id);
