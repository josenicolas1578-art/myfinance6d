import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, userDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `O usuário criou um gestor financeiro personalizado chamado "${name}".
A descrição detalhada que ele forneceu foi: "${userDescription}"

Crie uma descrição CURTA (máximo 8 palavras) para exibir no menu. 
Exemplos: "Análise de investimentos com Tom", "Controle de gastos freelancer", "Gestão de criptomoedas"
Retorne APENAS a descrição curta, sem aspas, sem explicação.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ description: `Gestor ${name}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const shortDesc = data.choices?.[0]?.message?.content?.trim() || `Gestor ${name}`;

    return new Response(JSON.stringify({ description: shortDesc }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-agent-description error:", e);
    return new Response(JSON.stringify({ description: "Gestor personalizado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
