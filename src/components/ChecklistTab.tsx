import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

const ChecklistTab = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar checklist");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newItem.trim() || !user) return;

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({ user_id: user.id, title: newItem.trim() })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar item");
    } else if (data) {
      setItems([...items, data]);
      setNewItem("");
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    const { error } = await supabase
      .from("checklist_items")
      .update({ completed: !item.completed })
      .eq("id", item.id);

    if (error) {
      toast.error("Erro ao atualizar item");
    } else {
      setItems(items.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i)));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("checklist_items").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao deletar item");
    } else {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const pending = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando checklist...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add item */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova tarefa..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="icon" disabled={!newItem.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Pendentes ({pending.length})
          </p>
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card group"
            >
              <button onClick={() => handleToggle(item)} className="text-muted-foreground hover:text-primary transition-colors">
                <Circle className="w-5 h-5" />
              </button>
              <span className="flex-1 text-sm text-foreground">{item.title}</span>
              <button
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed items */}
      {completed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Concluídas ({completed.length})
          </p>
          {completed.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 group"
            >
              <button onClick={() => handleToggle(item)} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{item.title}</span>
              <button
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhuma tarefa ainda</p>
          <p className="text-sm text-muted-foreground/70">Adicione suas tarefas e metas diárias!</p>
        </div>
      )}
    </div>
  );
};

export default ChecklistTab;
