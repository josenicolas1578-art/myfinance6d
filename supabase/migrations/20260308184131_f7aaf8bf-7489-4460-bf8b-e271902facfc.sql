-- Add salary columns to profiles
ALTER TABLE public.profiles ADD COLUMN salary_type TEXT CHECK (salary_type IN ('fixo', 'variavel'));
ALTER TABLE public.profiles ADD COLUMN salary_amount NUMERIC(12,2);