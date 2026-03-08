import { useEffect, useState } from "react";
import { X, DollarSign, TrendingUp, RotateCcw, Plus, Bot, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type ChatTopic = string;

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
}

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  activeTopic: ChatTopic;
  onSelectTopic: (topic: ChatTopic) => void;
}

const builtInTopics = [
  { id: "gastos", label: "Gastos", icon: DollarSign, description: "Controle de despesas e gastos" },
  { id: "investimentos", label: "Investimentos", icon: TrendingUp, description: "Dicas e análise de investimentos" },
  { id: "retornos", label: "Retornos / Ganhos", icon: RotateCcw, description: "Acompanhamento de retornos e ganhos" },
];

const SideMenu = ({ open, onClose, activeTopic, onSelectTopic }: SideMenuProps) => {
  const { user } = useAuth();
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteAgent, setDeleteAgent] = useState<CustomAgent | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (user) loadAgents();
  }, [user]);

  const loadAgents = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("custom_agents")
      .select("id, name, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setCustomAgents((data as CustomAgent[]) || []);
  };

  const handleCreateClick = () => {
    onClose();
    // Small delay so menu closes before dialog opens
    setTimeout(() => setDialogOpen(true), 200);
  };

  const createAgent = async () => {
    if (!agentName.trim() || !user) return;
    setCreating(true);
    const { error } = await supabase.from("custom_agents").insert({
      user_id: user.id,
      name: agentName.trim(),
      description: agentDesc.trim(),
    });
    if (error) {
      toast.error("Erro ao criar gestor");
    } else {
      toast.success(`Gestor "${agentName.trim()}" criado!`);
      setAgentName("");
      setAgentDesc("");
      setDialogOpen(false);
      loadAgents();
    }
    setCreating(false);
  };

  const confirmDelete = async () => {
    if (!deleteAgent) return;
    const { error } = await supabase
      .from("custom_agents")
      .delete()
      .eq("id", deleteAgent.id);
    if (error) {
      toast.error("Erro ao excluir gestor");
    } else {
      toast.success(`Gestor "${deleteAgent.name}" excluído`);
      // If active topic was this agent, switch to gastos
      if (activeTopic === `agent-${deleteAgent.id}`) {
        onSelectTopic("gastos");
      }
      loadAgents();
    }
    setDeleteAgent(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-3/4 max-w-xs bg-card border-r border-border shadow-elevated transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
          <span className="text-sm font-heading font-semibold text-foreground">Chats</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Built-in topics */}
          {builtInTopics.map((topic) => {
            const isActive = activeTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  onSelectTopic(topic.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <topic.icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{topic.label}</p>
                  <p className="text-[10px] opacity-70 whitespace-normal">{topic.description}</p>
                </div>
              </button>
            );
          })}

          {/* Custom agents */}
          {customAgents.map((agent) => {
            const isActive = activeTopic === `agent-${agent.id}`;
            return (
              <div
                key={agent.id}
                className={`flex items-center gap-1 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/15 border border-primary/50 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]"
                    : "border border-primary/20 shadow-[0_0_8px_-3px_hsl(var(--primary)/0.3)]"
                }`}
              >
                <button
                  onClick={() => {
                    onSelectTopic(`agent-${agent.id}`);
                    onClose();
                  }}
                  className={`flex-1 flex items-center gap-3 px-3 py-3 text-left transition-all ${
                    isActive ? "text-primary" : "text-primary/80 hover:text-primary"
                  }`}
                >
                  <Bot className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{agent.name}</p>
                    {agent.description && (
                      <p className="text-[10px] opacity-70 whitespace-normal">{agent.description}</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    setTimeout(() => setDeleteAgent(agent), 200);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0 mr-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Create agent button */}
        <div className="p-3 border-t border-border shrink-0">
          <button
            onClick={handleCreateClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 neon-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            Criar gestor
          </button>
        </div>
      </div>

      {/* Create agent dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="z-[60] w-[calc(100%-3rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Criar gestor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome do gestor</label>
              <Input
                placeholder="Ex: Controle de freelas"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Descrição (opcional)</label>
              <Textarea
                placeholder="Descreva brevemente o propósito deste gestor..."
                value={agentDesc}
                onChange={(e) => setAgentDesc(e.target.value)}
                className="bg-secondary border-border resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={createAgent}
              disabled={!agentName.trim() || creating}
              className="flex-1 neon-glow"
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteAgent} onOpenChange={(open) => !open && setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Excluir gestor
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o gestor <strong>"{deleteAgent?.name}"</strong>? O histórico de conversas será mantido, mas o gestor não aparecerá mais no menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SideMenu;
