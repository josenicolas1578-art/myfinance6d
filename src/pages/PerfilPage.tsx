import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Camera, Pencil, Check, X, Wallet, Target, PiggyBank, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ProfileForm from "@/components/ProfileForm";
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

const GOAL_LABELS: Record<string, string> = {
  economizar: "Economizar dinheiro",
  sair_dividas: "Sair das dívidas",
  investir: "Começar a investir",
  organizar: "Organizar minhas finanças",
};

const formatBRL = (value: number | null | undefined) => {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatCurrencyInput = (value: string) => {
  const nums = value.replace(/\D/g, "");
  const amount = parseInt(nums || "0", 10) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseCurrency = (value: string) => {
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || null;
};

type EditableField = "current_balance" | "salary_amount" | "fixed_expenses" | "financial_goal" | "savings_target" | "salary_type" | null;

const FINANCIAL_GOALS = [
  { value: "economizar", label: "Economizar dinheiro" },
  { value: "sair_dividas", label: "Sair das dívidas" },
  { value: "investir", label: "Começar a investir" },
  { value: "organizar", label: "Organizar minhas finanças" },
];

const PerfilPage = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formCompleted, setFormCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingForm, setEditingForm] = useState(false);
  const [balanceConfirmOpen, setBalanceConfirmOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline editing
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, form_completed, salary_type, salary_amount, fixed_expenses, financial_goal, savings_target, current_balance")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || null);
      setFormCompleted(data.form_completed ?? false);
      setProfileData(data);
    } else {
      setFormCompleted(false);
    }
    setLoading(false);
    setEditingForm(false);
  };

  const startEdit = (field: EditableField) => {
    if (!field || !profileData) return;
    if (field === "financial_goal") {
      setEditValue(profileData.financial_goal || "");
    } else if (field === "salary_type") {
      setEditValue(profileData.salary_type || "");
    } else {
      const val = profileData[field];
      setEditValue(val != null ? formatBRL(val) : "");
    }
    setEditingField(field);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveField = async () => {
    if (!editingField) return;
    setSaving(true);
    try {
      let updateData: Record<string, any> = {};

      if (editingField === "financial_goal" || editingField === "salary_type") {
        updateData[editingField] = editValue;
      } else {
        updateData[editingField] = parseCurrency(editValue);
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user!.id);

      if (error) throw error;
      toast.success("Atualizado com sucesso!");
      setEditingField(null);
      setEditValue("");
      fetchProfile();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 12) {
      setEditValue(raw ? formatCurrencyInput(raw) : "");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user!.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user!.id);
      if (updateError) throw updateError;
      setAvatarUrl(url);
      toast.success("Foto atualizada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!formCompleted || editingForm) {
    return <ProfileForm userId={user!.id} onComplete={fetchProfile} />;
  }

  const renderFieldCard = (
    field: EditableField,
    icon: React.ReactNode,
    label: string,
    displayValue: string,
    highlight = false,
  ) => {
    const isEditing = editingField === field;
    const isCurrency = field !== "financial_goal" && field !== "salary_type";
    const isGoal = field === "financial_goal";
    const isSalaryType = field === "salary_type";

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${highlight ? "bg-primary/10 border border-primary/30" : "bg-secondary border border-border"}`}>
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-1">
              {isCurrency && (
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  onChange={handleCurrencyChange}
                  className="h-8 text-sm bg-background border-border"
                  autoFocus
                />
              )}
              {isGoal && (
                <div className="flex flex-col gap-1 w-full">
                  {FINANCIAL_GOALS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setEditValue(g.value)}
                      className={`py-1.5 px-2 rounded text-xs text-left transition-all ${
                        editValue === g.value
                          ? "bg-primary/10 border border-primary text-primary"
                          : "bg-background border border-border text-muted-foreground"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
              {isSalaryType && (
                <div className="flex gap-1.5 w-full">
                  {[{ v: "fixo", l: "Fixo" }, { v: "variavel", l: "Variável" }].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setEditValue(o.v)}
                      className={`flex-1 py-1.5 rounded text-xs transition-all ${
                        editValue === o.v
                          ? "bg-primary/10 border border-primary text-primary"
                          : "bg-background border border-border text-muted-foreground"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-1 shrink-0">
                <button onClick={saveField} disabled={saving} className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelEdit} className="w-7 h-7 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm font-medium ${highlight ? "text-base font-bold text-primary" : "text-foreground"}`}>
              {displayValue}
            </p>
          )}
        </div>
        {!isEditing && (
          <button onClick={() => startEdit(field)} className="w-7 h-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center px-5 py-6 gap-5">
      {/* Avatar */}
      <div className="relative">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/40 neon-glow flex items-center justify-center bg-secondary transition-opacity hover:opacity-80"
          disabled={uploading}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-heading font-bold text-primary">
              {displayName ? displayName[0].toUpperCase() : "?"}
            </span>
          )}
        </button>
        <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card">
          <Camera className="w-3 h-3 text-primary-foreground" />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
      </div>

      {/* Info */}
      <div className="text-center space-y-0.5">
        <h2 className="text-lg font-heading font-bold text-foreground">{displayName || "Usuário"}</h2>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>

      {/* Financial info */}
      {profileData && (
        <div className="w-full max-w-xs space-y-3">
          <h3 className="text-sm font-heading font-semibold text-foreground">Perfil Financeiro</h3>
          <div className="space-y-2">
            {renderFieldCard("current_balance", <DollarSign className="w-4 h-4 text-primary" />, "Saldo atual na conta", formatBRL(profileData.current_balance), true)}
            {renderFieldCard("salary_type", <Wallet className="w-4 h-4 text-primary" />, "Tipo de renda", profileData.salary_type === "fixo" ? "Renda Fixa" : "Renda Variável")}
            {profileData.salary_type === "fixo" && renderFieldCard("salary_amount", <DollarSign className="w-4 h-4 text-primary" />, "Salário mensal", formatBRL(profileData.salary_amount))}
            {renderFieldCard("fixed_expenses", <Wallet className="w-4 h-4 text-primary" />, "Despesas fixas mensais", formatBRL(profileData.fixed_expenses))}
            {renderFieldCard("financial_goal", <Target className="w-4 h-4 text-primary" />, "Objetivo financeiro", GOAL_LABELS[profileData.financial_goal] || profileData.financial_goal || "—")}
            {renderFieldCard("savings_target", <PiggyBank className="w-4 h-4 text-primary" />, "Meta de economia mensal", formatBRL(profileData.savings_target))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="w-full max-w-xs mt-2">
        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default PerfilPage;