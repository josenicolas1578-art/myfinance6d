

## Problem

The `extract-transaction` edge function's AI prompt doesn't distinguish between **current transactions** and **future/planned ones**. When the user said "I'll invest 160 in a machine that will return 240 next month," the AI extracted both 160 and 240 as current investment transactions. The 240 is a future return, not something that happened today.

## Solution

Update the AI extraction prompt in `supabase/functions/extract-transaction/index.ts` to:

1. **Only extract transactions that already happened** -- ignore future/planned amounts mentioned in conversation
2. **Add explicit examples** for this scenario:
   - "Investi 160 numa maquininha que vai retornar 240 mês que vem" → only `[{"amount": 160, "description": "Maquininha da Ton", "category": "investimentos"}]`
   - The 240 should NOT be extracted because it hasn't happened yet
3. **Add a clear rule** in the prompt: "IMPORTANTE: Extraia APENAS transações que JÁ ACONTECERAM. Valores futuros, previsões ou expectativas de retorno NÃO devem ser extraídos."

### File changed
- `supabase/functions/extract-transaction/index.ts` -- update the `extractPrompt` string

This is a prompt-only fix, no database or frontend changes needed.

