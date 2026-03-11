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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { topic } = await req.json();
    if (!topic) throw new Error("Missing topic");

    // Get the last 2 messages (user + assistant pair)
    const { data: lastMessages } = await supabase
      .from("chat_messages")
      .select("id, role, created_at")
      .eq("user_id", user.id)
      .eq("topic", topic)
      .order("created_at", { ascending: false })
      .limit(2);

    if (!lastMessages || lastMessages.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "Sem mensagens para desfazer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the user message timestamp to locate related transactions
    const userMsg = lastMessages.find(m => m.role === "user");
    const messageIds = lastMessages.map(m => m.id);

    // Delete the last message pair from chat_messages
    await supabase
      .from("chat_messages")
      .delete()
      .in("id", messageIds);

    // If there was a user message, find and reverse transactions created around that time
    if (userMsg) {
      const msgTime = new Date(userMsg.created_at);
      const timeBefore = new Date(msgTime.getTime() - 5000).toISOString();
      const timeAfter = new Date(msgTime.getTime() + 30000).toISOString();

      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, amount, category")
        .eq("user_id", user.id)
        .gte("created_at", timeBefore)
        .lte("created_at", timeAfter);

      if (transactions && transactions.length > 0) {
        // Reverse balance atomically
        for (const t of transactions) {
          // Reverse: if it was gastos/investimentos (subtracted), add back; if retornos (added), subtract
          const reverseCategory = t.category === "retornos" ? "gastos" : "retornos";
          await supabase.rpc("adjust_balance", {
            _user_id: user.id,
            _amount: t.amount,
            _category: reverseCategory,
          });
        }

        // Delete the transactions
        await supabase
          .from("transactions")
          .delete()
          .in("id", transactions.map(t => t.id));
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("undo-last-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
