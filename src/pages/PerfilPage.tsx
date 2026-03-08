import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Camera, Check } from "lucide-react";
import { toast } from "sonner";

type SalaryType = "fixo" | "variavel" | null;

const PerfilPage = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [salaryType, setSalaryType] = useState<SalaryType>(null);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, salary_type, salary_amount")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || null);
      setSalaryType((data.salary_type as SalaryType) || null);
      setSalaryAmount(data.salary_amount ? String(data.salary_amount) : "");
    }
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

  const handleSaveSalary = async () => {
    if (!salaryType) {
      toast.error("Selecione o tipo de salário");
      return;
    }

    setSaving(true);
    try {
      const amount = salaryType === "fixo" && salaryAmount 
        ? parseFloat(salaryAmount.replace(/[^\d,.-]/g, "").replace(",", ".")) 
        : null;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          salary_type: salaryType, 
          salary_amount: amount 
        })
        .eq("user_id", user!.id);

      if (error) throw error;
      toast.success("Informações salvas!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    const nums = value.replace(/\D/g, "");
    const amount = parseInt(nums || "0", 10) / 100;
    return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 12) {
      setSalaryAmount(raw ? formatCurrency(raw) : "");
    }
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

      {/* Salary section */}
      <div className="w-full max-w-xs space-y-4 mt-2">
        <div className="space-y-2">
          <Label className="text-sm">Qual o tipo da sua renda?</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSalaryType("fixo")}
              className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                salaryType === "fixo"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
              }`}
            >
              Salário Fixo
            </button>
            <button
              type="button"
              onClick={() => setSalaryType("variavel")}
              className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                salaryType === "variavel"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
              }`}
            >
              Variável / PJ
            </button>
          </div>
        </div>

        {salaryType === "fixo" && (
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="salary" className="text-sm">Qual é o seu salário mensal?</Label>
            <Input
              id="salary"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={salaryAmount}
              onChange={handleSalaryChange}
              className="h-10 bg-secondary border-border focus:border-primary text-sm"
            />
          </div>
        )}

        <Button
          onClick={handleSaveSalary}
          disabled={saving || !salaryType}
          className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold text-sm"
        >
          {saving ? "Salvando..." : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Salvar informações
            </>
          )}
        </Button>
      </div>

      {/* Logout */}
      <div className="w-full max-w-xs mt-4">
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
