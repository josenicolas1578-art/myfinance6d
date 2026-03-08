import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Camera, Pencil, Check, X, Wallet, Target, PiggyBank, DollarSign, AlertTriangle, Trophy, Sparkles, PartyPopper } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOTIVATIONAL_QUOTES = [
  "Quem disse que o céu é o limite nunca viu sua determinação! 🚀",
  "Cada centavo economizado é um passo rumo à liberdade financeira. Continue! 💪",
  "Você provou que disciplina transforma sonhos em realidade. Agora, sonhe maior! ✨",
  "O sucesso financeiro não é sorte, é consistência. E você tem de sobra! 🔥",
  "Hoje você colhe o que plantou. Amanhã, plante ainda mais alto! 🌱",
  "Grandes conquistas começam com pequenos hábitos. Você é a prova viva disso! 🏆",
  "Seu eu do futuro agradece cada decisão que você tomou até aqui. Continue! 💎",
  "Dinheiro é ferramenta, disciplina é poder. Você dominou os dois! ⚡",
  "Não existe teto pra quem tem mentalidade de crescimento. Bora pra próxima! 🎯",
  "A maioria desiste no meio do caminho. Você chegou até o fim. Isso é raro! 👑",
  "Sua conta bancária é reflexo da sua mentalidade. E a sua é de campeão! 🏅",
  "Poucos têm a coragem de definir metas e a disciplina de alcançá-las. Você é um deles! 💫",
  "Enquanto muitos sonham, você age. Essa é a diferença. Próxima meta! 🎖️",
  "Seu progresso é inspirador. Imagine onde você estará daqui a um ano! 📈",
  "A jornada é longa, mas você provou que está preparado. Vamos mais alto! 🌟",
];

const getRandomMotivation = () => {
  const usedKey = "myfinance_used_motivations";
  let used: number[] = [];
  try { used = JSON.parse(localStorage.getItem(usedKey) || "[]"); } catch {}
  
  // If all used, reset
  if (used.length >= MOTIVATIONAL_QUOTES.length) {
    used = [];
  }
  
  const available = MOTIVATIONAL_QUOTES.map((_, i) => i).filter((i) => !used.includes(i));
  const randomIdx = available[Math.floor(Math.random() * available.length)];
  used.push(randomIdx);
  localStorage.setItem(usedKey, JSON.stringify(used));
  
  return MOTIVATIONAL_QUOTES[randomIdx];
};

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

  // Goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("");

  // Inline editing
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  // Detect goal achievement
  useEffect(() => {
    if (!profileData || !user) return;
    const goal = profileData.goal_amount ?? 0;
    const balance = profileData.current_balance ?? 0;
    if (goal > 0 && balance >= goal) {
      const celebratedKey = `myfinance_celebrated_${user.id}_${goal}`;
      if (!localStorage.getItem(celebratedKey)) {
        localStorage.setItem(celebratedKey, "true");
        setCelebrationMsg(getRandomMotivation());
        setCelebrationOpen(true);
      }
    }
  }, [profileData, user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, form_completed, salary_type, salary_amount, fixed_expenses, financial_goal, savings_target, current_balance, goal_amount")
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
    if (field === "current_balance") {
      setBalanceConfirmOpen(true);
      return;
    }
    openFieldEditor(field);
  };

  const openFieldEditor = (field: EditableField) => {
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

  const handleGoalCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 12) {
      setGoalInput(raw ? formatCurrencyInput(raw) : "");
    }
  };

  const saveGoal = async () => {
    setSavingGoal(true);
    try {
      const amount = parseCurrency(goalInput);
      const { error } = await supabase
        .from("profiles")
        .update({ goal_amount: amount })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Meta definida com sucesso!");
      setGoalModalOpen(false);
      setGoalInput("");
      fetchProfile();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar meta");
    } finally {
      setSavingGoal(false);
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

  // Goal progress
  const goalAmount = profileData?.goal_amount ?? 0;
  const currentBalance = profileData?.current_balance ?? 0;
  const goalProgress = goalAmount > 0 ? Math.min(Math.max(currentBalance / goalAmount, 0), 1) : 0;

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

      {/* Goal Progress Section */}
      <div className="w-full max-w-xs">
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-heading font-bold text-foreground">Minha Meta</span>
            </div>
            {goalAmount > 0 && (
              <span className="text-xs font-semibold text-primary">{formatBRL(goalAmount)}</span>
            )}
          </div>

          {goalAmount > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs text-muted-foreground">Saldo atual</span>
                <span className="text-sm font-bold text-foreground">{formatBRL(currentBalance)}</span>
              </div>
              {/* Progress bar */}
              <div className="relative h-4 rounded-full bg-secondary/80 border border-border overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${goalProgress * 100}%`,
                    background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                    boxShadow: "0 0 12px hsl(var(--primary) / 0.5), 0 0 24px hsl(var(--primary) / 0.2)",
                  }}
                />
                {/* Glow dot at the end */}
                {goalProgress > 0.03 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary-foreground border-2 border-primary"
                    style={{
                      left: `calc(${goalProgress * 100}% - 6px)`,
                      boxShadow: "0 0 8px hsl(var(--primary) / 0.8)",
                    }}
                  />
                )}
              </div>
              <button
                onClick={() => {
                  setGoalInput(goalAmount ? formatBRL(goalAmount) : "");
                  setGoalModalOpen(true);
                }}
                className="w-full py-2 rounded-lg border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                Alterar meta
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setGoalInput("");
                setGoalModalOpen(true);
              }}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 neon-glow transition-all"
            >
              Definir Meta
            </button>
          )}
        </div>
      </div>

      {/* Financial info */}
      {profileData && (
        <div className="w-full max-w-xs space-y-3">
          <h3 className="text-sm font-heading font-semibold text-foreground">Perfil Financeiro</h3>
          <div className="space-y-2">
            {renderFieldCard("current_balance", <DollarSign className="w-4 h-4 text-primary" />, "Saldo atual na conta", formatBRL(profileData.current_balance), true)}
            {profileData.salary_type === "fixo" && renderFieldCard("salary_amount", <DollarSign className="w-4 h-4 text-primary" />, "Salário mensal", formatBRL(profileData.salary_amount))}
            {renderFieldCard("fixed_expenses", <Wallet className="w-4 h-4 text-primary" />, "Despesas fixas mensais", formatBRL(profileData.fixed_expenses))}
            {renderFieldCard("financial_goal", <Target className="w-4 h-4 text-primary" />, "Objetivo financeiro", GOAL_LABELS[profileData.financial_goal] || profileData.financial_goal || "—")}
            {renderFieldCard("savings_target", <PiggyBank className="w-4 h-4 text-primary" />, "Meta de economia mensal", formatBRL(profileData.savings_target))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="w-full max-w-xs mt-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da conta</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja sair da conta?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={signOut}
              >
                Sim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Balance confirm dialog */}
      <AlertDialog open={balanceConfirmOpen} onOpenChange={setBalanceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Alterar saldo manualmente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Alterar o saldo manualmente pode desconfigurar o acompanhamento dos seus gastos e retornos, prejudicando a análise e o progresso registrados pelo aplicativo. Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => openFieldEditor("current_balance")}
            >
              Sim, alterar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Goal modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Definir Meta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {currentBalance < 5000 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Digite o valor da meta que você deseja alcançar.
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={goalInput}
                  onChange={handleGoalCurrencyChange}
                  className="h-10 bg-secondary border-border focus:border-primary text-sm"
                  autoFocus
                />
                <Button
                  onClick={saveGoal}
                  disabled={savingGoal || !goalInput}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold"
                >
                  {savingGoal ? "Salvando..." : "Salvar Meta"}
                </Button>
              </>
            ) : (() => {
              const step = currentBalance >= 10000 ? 5000 : 1000;
              const base = Math.ceil(currentBalance / step) * step;
              const start = base > currentBalance ? base : base + step;
              const options = Array.from({ length: 4 }, (_, i) => start + step * i);
              return (
                <>
                  <p className="text-xs text-muted-foreground">
                    Escolha sua próxima meta. Seu saldo atual é{" "}
                    <span className="text-primary font-semibold">{formatBRL(currentBalance)}</span>.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((val) => (
                      <button
                        key={val}
                        onClick={() => setGoalInput(formatBRL(val))}
                        className={`py-3 rounded-lg border text-sm font-semibold transition-all ${
                          parseCurrency(goalInput) === val
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-foreground hover:border-primary/40"
                        }`}
                      >
                        {formatBRL(val)}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={saveGoal}
                    disabled={savingGoal || !goalInput}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold"
                  >
                    {savingGoal ? "Salvando..." : "Salvar Meta"}
                  </Button>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal celebration dialog */}
      <Dialog open={celebrationOpen} onOpenChange={setCelebrationOpen}>
        <DialogContent className="max-w-xs border-primary/40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="relative flex flex-col items-center text-center gap-5 py-4">
            {/* Animated icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center neon-glow animate-scale-in">
                <PartyPopper className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center animate-bounce">
                <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
            </div>

            <div className="space-y-2 animate-fade-in">
              <h2 className="text-xl font-heading font-black text-foreground">
                🎉 Parabéns!
              </h2>
              <p className="text-sm text-foreground font-medium">
                Você atingiu sua meta de{" "}
                <span className="text-primary font-bold neon-text">
                  {formatBRL(profileData?.goal_amount)}
                </span>
              </p>
            </div>

            <div className="px-3 py-3 rounded-xl bg-secondary/60 border border-border animate-fade-in">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "{celebrationMsg}"
              </p>
            </div>

            <p className="text-xs text-muted-foreground animate-fade-in">
              Vamos sonhar mais alto? Defina uma nova meta!
            </p>

            <Button
              onClick={() => {
                setCelebrationOpen(false);
                setGoalInput("");
                setGoalModalOpen(true);
              }}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-bold text-sm animate-fade-in"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Definir Nova Meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerfilPage;