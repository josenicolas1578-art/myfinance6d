
UPDATE transactions 
SET transaction_date = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE created_at::date = '2026-03-11' 
AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = '2026-03-10';
