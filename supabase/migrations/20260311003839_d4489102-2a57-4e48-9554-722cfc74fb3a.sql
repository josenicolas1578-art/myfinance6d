
CREATE OR REPLACE FUNCTION public.adjust_balance(_user_id uuid, _amount numeric, _category text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _category = 'retornos' THEN
    UPDATE profiles SET current_balance = COALESCE(current_balance, 0) + _amount WHERE user_id = _user_id;
  ELSIF _category IN ('gastos', 'investimentos') THEN
    UPDATE profiles SET current_balance = COALESCE(current_balance, 0) - _amount WHERE user_id = _user_id;
  END IF;
END;
$$;
