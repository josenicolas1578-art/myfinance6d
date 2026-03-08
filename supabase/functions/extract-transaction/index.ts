import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { userMessage, assistantMessage, topic } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Always auto-detect category from message content
    const categoryInstruction = `Detecte automaticamente a categoria de cada transação:
- "gastos" para despesas, compras, pagamentos
- "investimentos" para aportes, investimentos
- "retornos" para lucros, rendimentos, ganhos, salários recebidos`;

    const extractPrompt = `Você é um extrator de transações financeiras extremamente preciso. Analise a mensagem do usuário e extraia TODAS as transações financeiras NOVAS.

REGRAS CRÍTICAS:
1. Extraia APENAS transações que JÁ ACONTECERAM (não futuras/projeções).
2. Cada transação pertence a UMA ÚNICA categoria. NUNCA duplique.
3. NÃO re-extraia valores mencionados como contexto de transações anteriores.
4. Se o usuário menciona retorno E investimento original na mesma frase, extraia APENAS o retorno.

CLASSIFICAÇÃO POR PALAVRAS-CHAVE:

"gastos" (dinheiro que SAIU para consumo pessoal):
- "gastei", "paguei", "comprei" (roupas, comida, eletrônicos, presentes para outros)
- "perdi" (perda de dinheiro)
- "almocei", "jantei", "comi" (alimentação)
- "assinei" (assinaturas, serviços)
- "conta de", "boleto", "parcela"
- Uber, mercado, farmácia, restaurante, lanche, roupa, camisa, tênis, celular

"investimentos" (dinheiro aplicado com expectativa de RETORNO):
- "investi", "apliquei", "aportei"
- "comprei" + (ações, cripto, maquininha de cartão, equipamento para trabalho/negócio)
- Ações, fundos, cripto, bitcoin, maquininha, equipamento profissional

"retornos" (dinheiro que ENTROU):
- "recebi", "ganhei", "me deram", "me pagaram"
- "vendi" (venda de produto/serviço)
- "entrou", "caiu na conta"
- "salário", "freelance", "retorno", "lucro", "rendimento"
- "ganhei de presente" (presente recebido em dinheiro)

ATENÇÃO: "comprei uma camisa" = GASTO. "comprei ações" = INVESTIMENTO. O contexto da compra define a categoria!

Mensagem do usuário: "${userMessage}"
Resposta do assistente: "${assistantMessage}"

Retorne APENAS um JSON válido (sem markdown, sem texto extra). Se não houver transação NOVA, retorne [].
Formato: [{"amount": numero_positivo, "description": "descrição curta", "category": "gastos"|"investimentos"|"retornos"}]

Exemplos:
- "Comprei uma camisa de 240 reais" → [{"amount": 240, "description": "Camisa", "category": "gastos"}]
- "Gastei 9 reais com uber" → [{"amount": 9, "description": "Uber", "category": "gastos"}]
- "Comprei um tênis de 350" → [{"amount": 350, "description": "Tênis", "category": "gastos"}]
- "Perdi 50 reais" → [{"amount": 50, "description": "Perda", "category": "gastos"}]
- "Investi 160 numa maquininha" → [{"amount": 160, "description": "Maquininha", "category": "investimentos"}]
- "Comprei 500 em ações" → [{"amount": 500, "description": "Ações", "category": "investimentos"}]
- "Recebi 1000 de salário" → [{"amount": 1000, "description": "Salário", "category": "retornos"}]
- "Vendi um produto por 200" → [{"amount": 200, "description": "Venda de produto", "category": "retornos"}]
- "Me deram 100 reais de presente" → [{"amount": 100, "description": "Presente recebido", "category": "retornos"}]
- "Ganhei 50 reais" → [{"amount": 50, "description": "Ganho", "category": "retornos"}]
- "Bom dia" → []`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: extractPrompt }],
      }),
    });

    if (!aiResp.ok) {
      console.error("AI extraction error:", aiResp.status);
      return new Response(JSON.stringify({ transactions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    let rawContent = aiData.choices?.[0]?.message?.content?.trim() || "[]";
    rawContent = rawContent.replace(/```json?\s*/g, "").replace(/```/g, "").trim();

    let transactions: { amount: number; description: string }[] = [];
    try {
      transactions = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(JSON.stringify({ transactions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return new Response(JSON.stringify({ transactions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert transactions
    const rows = transactions
      .filter((t: any) => t.amount > 0)
      .map((t: any) => ({
        user_id: user.id,
        category: t.category || "gastos",
        amount: t.amount,
        description: t.description || null,
        transaction_date: new Date().toISOString().split("T")[0],
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("transactions").insert(rows);
      if (insertError) console.error("Insert error:", insertError);

      // Update current_balance on profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_balance")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const currentBalance = profile.current_balance ?? 0;
        let balanceChange = 0;

        for (const r of rows) {
          if (r.category === "retornos") {
            balanceChange += r.amount;
          } else {
            balanceChange -= r.amount;
          }
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ current_balance: currentBalance + balanceChange })
          .eq("user_id", user.id);

        if (updateError) console.error("Balance update error:", updateError);
      }
    }

    return new Response(JSON.stringify({ transactions: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-transaction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
