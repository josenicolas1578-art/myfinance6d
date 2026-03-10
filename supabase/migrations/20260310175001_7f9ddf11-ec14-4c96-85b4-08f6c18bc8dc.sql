
CREATE TABLE public.checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist items"
ON public.checklist_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist items"
ON public.checklist_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist items"
ON public.checklist_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist items"
ON public.checklist_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
