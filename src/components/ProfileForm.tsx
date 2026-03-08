import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle, Target, Wallet, PiggyBank } from "lucide-react";
import { toast } from "sonner";

type SalaryType = "fixo" | "variavel";

interface ProfileFormProps {
  userId: string;
  onComplete: () => void;
}

const FINANCIAL_GOALS = [
  { value: "economizar", label: "Economizar dinheiro" },
  { value: "sair_dividas", label: "Sair das dívidas" },
  { value: "investir", label: "Começar a investir" },
  { value: "organizar", label: "Organizar minhas finanças" },
];

const ProfileForm = ({ userId, onComplete }: ProfileFormProps) => {
  const [step, setStep] = useState(0);
  const [salaryType, setSalaryType] = useState<SalaryType | null>(null);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [financialGoal, setFinancialGoal] = useState<string | null>(null);
  const [savingsTarget, setSavingsTarget] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: string) => {
    const nums = value.replace(/\D/g, "");
    const amount = parseInt(nums || "0", 10) / 100;
    return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleCurrencyChange = (
    setter: (v: string) => void,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 12) {
      setter(raw ? formatCurrency(raw) : "");
    }
  };

  const parseCurrency = (value: string) => {
    if (!value) return null;
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || null;
  };

  const handleSubmit = async () => {
    if (!salaryType || !financialGoal) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          salary_type: salaryType,
          salary_amount: salaryType === "fixo" ? parseCurrency(salaryAmount) : null,
          fixed_expenses: parseCurrency(fixedExpenses),
          financial_goal: financialGoal,
          savings_target: parseCurrency(savingsTarget),
          current_balance: parseCurrency(currentBalance),
          form_completed: true,
        })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Perfil financeiro salvo com sucesso!");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return !!salaryType && (salaryType === "variavel" || !!salaryAmount);
    if (step === 1) return !!fixedExpenses;
    if (step === 2) return !!financialGoal;
    if (step === 3) return true;
    if (step === 4) return !!currentBalance;
    return false;
  };

  const totalSteps = 5;

  return (
    <div className="flex flex-col items-center px-5 py-6 gap-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-semibold font-heading">Formulário obrigatório</span>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Precisamos de algumas informações para personalizar sua experiência financeira.
      </p>

      {/* Progress */}
      <div className="flex gap-1.5 w-full max-w-xs">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= step ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </div>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-4">
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-foreground">
              <Wallet className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Qual o tipo da sua renda?</Label>
            </div>
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
                Renda Variável
              </button>
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
                  onChange={(e) => handleCurrencyChange(setSalaryAmount, e)}
                  className="h-10 bg-secondary border-border focus:border-primary text-sm"
                />
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-foreground">
              <Wallet className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Qual o total das suas despesas fixas mensais?</Label>
            </div>
            <p className="text-xs text-muted-foreground">Aluguel, contas, internet, transporte, etc.</p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={fixedExpenses}
              onChange={(e) => handleCurrencyChange(setFixedExpenses, e)}
              className="h-10 bg-secondary border-border focus:border-primary text-sm"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-foreground">
              <Target className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Qual seu principal objetivo financeiro?</Label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {FINANCIAL_GOALS.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setFinancialGoal(goal.value)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium text-left transition-all ${
                    financialGoal === goal.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-foreground">
              <PiggyBank className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Quanto quer guardar por mês?</Label>
            </div>
            <p className="text-xs text-muted-foreground">Pode ser um valor aproximado. (Opcional)</p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={savingsTarget}
              onChange={(e) => handleCurrencyChange(setSavingsTarget, e)}
              className="h-10 bg-secondary border-border focus:border-primary text-sm"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-foreground">
              <Wallet className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Quantos reais você tem na sua conta nesse exato momento?</Label>
            </div>
            <p className="text-xs text-muted-foreground">Seja honesto — isso nos ajuda a te dar conselhos melhores.</p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={currentBalance}
              onChange={(e) => handleCurrencyChange(setCurrentBalance, e)}
              className="h-10 bg-secondary border-border focus:border-primary text-sm"
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 h-10 text-sm"
            >
              Voltar
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold text-sm"
            >
              Próximo
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold text-sm"
            >
              {saving ? "Salvando..." : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Concluir
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
