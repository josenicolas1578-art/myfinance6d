import { useState, useEffect, useRef } from "react";
import { Bot, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const IA_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ia-chat`;

const IAPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load message history
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("ia_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (!error && data) {
        setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      }
      setLoadingHistory(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveMessage = async (role: string, content: string) => {
    if (!user) return;
    await supabase.from("ia_messages").insert({ user_id: user.id, role, content });
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("ia_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast("Conversa limpa!");
  };

  const send = async () => {
    if (!input.trim() || isLoading || !user) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    await saveMessage("user", userMsg.content);

    try {
      const resp = await fetch(IA_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast(err.error || "Erro ao enviar mensagem");
        setIsLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setIsLoading(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      const updateAssistant = (text: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
          }
          return [...prev, { role: "assistant", content: text }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { assistantText += c; updateAssistant(assistantText); }
          } catch { /* partial */ }
        }
      }

      if (assistantText) await saveMessage("assistant", assistantText);
    } catch (e) {
      console.error(e);
      toast("Erro ao se comunicar com a IA");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-heading font-bold text-foreground">IA</h1>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearHistory} title="Limpar conversa">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingHistory ? (
          <p className="text-center text-muted-foreground text-sm mt-8">Carregando conversa...</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Bot className="w-12 h-12 opacity-30" />
            <p className="text-sm">Comece uma conversa livre com a IA!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-muted-foreground">
              Pensando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default IAPage;
