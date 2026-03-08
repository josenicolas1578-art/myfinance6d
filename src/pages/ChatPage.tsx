import { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ChatTopic } from "@/components/SideMenu";

type Msg = { role: "user" | "assistant"; content: string };

const BUILT_IN_LABELS: Record<string, string> = {
  gastos: "Gastos",
  investimentos: "Investimentos",
  retornos: "Retornos / Ganhos",
};

const INITIAL_MESSAGES: Record<string, Msg[]> = {
  gastos: [{ role: "assistant", content: "Especifique o valor que você gastou e com o que você gastou." }],
  investimentos: [],
  retornos: [],
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  topic,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  topic: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, topic }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erro na conexão" }));
    throw new Error(err.error || "Erro na conexão");
  }

  if (!resp.body) throw new Error("Sem resposta");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

const EXTRACT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-transaction`;

const ChatPage = () => {
  const { chatTopic } = useOutletContext<{ chatTopic: ChatTopic }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formCompleted, setFormCompleted] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<Record<string, Msg[]>>({
    gastos: [...INITIAL_MESSAGES.gastos],
    investimentos: [],
    retornos: [],
  });
  const [loadedTopics, setLoadedTopics] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topicLabel, setTopicLabel] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustomAgent = chatTopic.startsWith("agent-");
  const messages = conversations[chatTopic] || [];

  // Resolve topic label
  useEffect(() => {
    if (BUILT_IN_LABELS[chatTopic]) {
      setTopicLabel(BUILT_IN_LABELS[chatTopic]);
    } else if (isCustomAgent) {
      const agentId = chatTopic.replace("agent-", "");
      supabase
        .from("custom_agents")
        .select("name, description")
        .eq("id", agentId)
        .maybeSingle()
        .then(({ data }) => {
          setTopicLabel((data as any)?.name || "Gestor");
        });
    }
  }, [chatTopic]);

  // Load messages from DB for current topic
  useEffect(() => {
    if (!user || loadedTopics.has(chatTopic)) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("topic", chatTopic)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const msgs = data.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
        setConversations((prev) => ({ ...prev, [chatTopic]: msgs }));
      } else if (INITIAL_MESSAGES[chatTopic]) {
        setConversations((prev) => ({ ...prev, [chatTopic]: [...INITIAL_MESSAGES[chatTopic]] }));
      } else {
        // Custom agent - empty start
        setConversations((prev) => ({ ...prev, [chatTopic]: [] }));
      }
      setLoadedTopics((prev) => new Set(prev).add(chatTopic));
    };

    loadMessages();
  }, [user, chatTopic, loadedTopics]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("form_completed")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setFormCompleted(data?.form_completed ?? false));
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveMessage = async (topic: string, role: string, content: string) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      topic,
      role,
      content,
    });
  };

  const extractTransactions = async (userMsg: string, aiMsg: string, topic: string) => {
    // Extract for built-in financial topics and custom agents
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      await fetch(EXTRACT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userMessage: userMsg, assistantMessage: aiMsg, topic }),
      });
    } catch (e) {
      console.error("extract error:", e);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setConversations((prev) => ({
      ...prev,
      [chatTopic]: [...(prev[chatTopic] || []), userMsg],
    }));
    setInput("");
    setIsLoading(true);

    saveMessage(chatTopic, "user", text);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setConversations((prev) => {
        const topicMsgs = prev[chatTopic] || [];
        const last = topicMsgs[topicMsgs.length - 1];
        if (last?.role === "assistant") {
          return {
            ...prev,
            [chatTopic]: topicMsgs.map((m, i) =>
              i === topicMsgs.length - 1 ? { ...m, content: assistantSoFar } : m
            ),
          };
        }
        return {
          ...prev,
          [chatTopic]: [...topicMsgs, { role: "assistant", content: assistantSoFar }],
        };
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        topic: isCustomAgent ? `custom:${topicLabel}` : chatTopic,
        onDelta: upsertAssistant,
        onDone: () => {
          setIsLoading(false);
          saveMessage(chatTopic, "assistant", assistantSoFar);
          extractTransactions(text, assistantSoFar, chatTopic);
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
      setIsLoading(false);
    }
  };

  if (formCompleted === false) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 text-center" style={{ height: "calc(100dvh - 56px - 64px)" }}>
        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center neon-glow">
          <AlertTriangle className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-3 max-w-[280px]">
          <h2 className="text-lg font-heading font-bold text-foreground">Quase lá!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para utilizar a plataforma de forma livre, é necessário responder um{" "}
            <span className="text-primary font-semibold">formulário obrigatório</span> na aba Perfil.
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/perfil")}
          className="px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 neon-glow transition-all shadow-lg shadow-primary/20"
        >
          Preencher Formulário
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px - 64px)" }}>
      {/* Topic banner */}
      <div className="px-4 py-2 bg-secondary/50 border-b border-border text-center">
        <p className="text-xs text-muted-foreground">
          Você está falando com o chat de{" "}
          <span className="text-primary font-semibold">{topicLabel}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Olá! Sou seu assistente de <span className="text-primary font-medium">{topicLabel}</span>.
            </p>
            <p className="text-xs text-muted-foreground">Como posso te ajudar?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Digite sua mensagem..."
            className="flex-1 h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-all neon-glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
