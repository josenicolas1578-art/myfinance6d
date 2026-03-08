import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  gastos: "Você é um assistente de controle de gastos. Seja direto e breve nas respostas. Use no máximo 2-3 frases por resposta. Responda em português brasileiro.",
  investimentos: "Você é um assistente de investimentos. Seja direto e breve nas respostas. Use no máximo 2-3 frases por resposta. Responda em português brasileiro.",
  retornos: "Você é um assistente de retornos financeiros. Seja direto e breve nas respostas. Use no máximo 2-3 frases por resposta. Responda em português brasileiro.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;
    if (topic.startsWith("custom:")) {
      const agentName = topic.replace("custom:", "");
      systemPrompt = `Você é ${agentName}, um gestor financeiro personalizado. Ajude o usuário com suas finanças de acordo com seu papel. Quando o usuário mencionar valores financeiros (gastos, investimentos, ganhos), registre e confirme. Seja direto e breve. Responda em português brasileiro.`;
    } else {
      systemPrompt = SYSTEM_PROMPTS[topic] || SYSTEM_PROMPTS.gastos;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
