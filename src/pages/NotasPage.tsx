import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const NotasPage = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar notas");
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    if (editingNote) {
      const { error } = await supabase
        .from("notes")
        .update({ title, content })
        .eq("id", editingNote.id);

      if (error) {
        toast.error("Erro ao atualizar nota");
      } else {
        toast.success("Nota atualizada!");
        fetchNotes();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("notes")
        .insert({ user_id: user!.id, title, content });

      if (error) {
        toast.error("Erro ao criar nota");
      } else {
        toast.success("Nota criada!");
        fetchNotes();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao deletar nota");
    } else {
      toast.success("Nota deletada!");
      setNotes(notes.filter((n) => n.id !== id));
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando notas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-foreground">Minhas Notas</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nova Nota
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              {editingNote ? "Editar Nota" : "Nova Nota"}
              <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Título da nota..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
            />
            <Textarea
              placeholder="Escreva sua nota aqui..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <Button onClick={handleSave} className="w-full gap-1.5">
              <Save className="w-4 h-4" />
              {editingNote ? "Salvar Alterações" : "Criar Nota"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma nota ainda</p>
            <p className="text-sm text-muted-foreground/70">
              Crie sua primeira nota para começar!
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{note.title}</h3>
                    {note.content && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {new Date(note.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(note)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(note.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotasPage;
