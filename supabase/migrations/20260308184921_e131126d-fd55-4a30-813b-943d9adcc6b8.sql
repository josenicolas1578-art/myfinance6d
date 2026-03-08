
ALTER TABLE public.profiles ADD COLUMN fixed_expenses NUMERIC(12,2);
ALTER TABLE public.profiles ADD COLUMN financial_goal TEXT;
ALTER TABLE public.profiles ADD COLUMN savings_target NUMERIC(12,2);
ALTER TABLE public.profiles ADD COLUMN form_completed BOOLEAN NOT NULL DEFAULT false;
