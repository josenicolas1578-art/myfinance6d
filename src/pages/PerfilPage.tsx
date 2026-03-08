import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Camera, Settings, Wallet, Target, PiggyBank, DollarSign } from "lucide-react";
import { toast } from "sonner";
import ProfileForm from "@/components/ProfileForm";

const GOAL_LABELS: Record<string, string> = {
  economizar: "Economizar dinheiro",
  sair_dividas: "Sair das dívidas",
  investir: "Começar a investir",
  organizar: "Organizar minhas finanças",
};

const formatBRL = (value: number | null) => {
  if (!value) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const PerfilPage = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formCompleted, setFormCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingForm, setEditingForm] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user!.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user!.id);

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
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
            {profileData.current_balance != null && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Saldo atual na conta</p>
                  <p className="text-base font-bold text-primary">{formatBRL(profileData.current_balance)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
              <Wallet className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tipo de renda</p>
                <p className="text-sm font-medium text-foreground">
                  {profileData.salary_type === "fixo" ? "Renda Fixa" : "Renda Variável"}
                </p>
              </div>
            </div>

            {profileData.salary_type === "fixo" && profileData.salary_amount && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Salário mensal</p>
                  <p className="text-sm font-medium text-foreground">{formatBRL(profileData.salary_amount)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
              <Wallet className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Despesas fixas mensais</p>
                <p className="text-sm font-medium text-foreground">{formatBRL(profileData.fixed_expenses)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Objetivo financeiro</p>
                <p className="text-sm font-medium text-foreground">
                  {GOAL_LABELS[profileData.financial_goal] || profileData.financial_goal || "—"}
                </p>
              </div>
            </div>

            {profileData.savings_target && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
                <PiggyBank className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Meta de economia mensal</p>
                  <p className="text-sm font-medium text-foreground">{formatBRL(profileData.savings_target)}</p>
                </div>
              </div>
            )}
            )}
          </div>
        </div>
      )}

      {/* Edit form button */}
      <Button
        variant="outline"
        className="w-full max-w-xs border-border text-muted-foreground hover:text-foreground"
        onClick={() => setEditingForm(true)}
      >
        <Settings className="w-4 h-4 mr-2" />
        Editar perfil financeiro
      </Button>

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
