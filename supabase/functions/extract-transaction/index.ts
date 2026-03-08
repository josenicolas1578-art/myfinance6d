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

    const systemPrompt = `Você é um extrator de transações financeiras. Retorne APENAS um array JSON válido. Sem markdown, sem texto, sem explicação. Apenas o array JSON.

REGRAS:
1. Extraia APENAS transações NOVAS da mensagem do usuário (não da resposta do assistente).
2. Cada transação tem: amount (número positivo), description (texto curto), category ("gastos", "investimentos" ou "retornos").
3. Se não houver transação, retorne [].

CLASSIFICAÇÃO:
- "gastos": gastei, paguei, comprei (roupas, comida, eletrônicos), perdi, conta de, boleto, uber, mercado, farmácia, restaurante
- "investimentos": investi, apliquei, aportei, comprei (ações, cripto, maquininha, equipamento de trabalho)
- "retornos": recebi, ganhei, me deram, me pagaram, vendi, entrou, caiu na conta, salário, freelance, retorno, lucro, rendimento

"comprei camisa" = gastos. "comprei ações" = investimentos. "recebi 5000" = retornos.`;

    const userContent = `Mensagem do usuário: "${userMessage}"
Resposta do assistente: "${assistantMessage}"

Extraia as transações da mensagem do USUÁRIO. Retorne APENAS o array JSON.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0,
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
