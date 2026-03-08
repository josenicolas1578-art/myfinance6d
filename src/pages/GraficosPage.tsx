import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingDown, TrendingUp, BarChart3, ShieldAlert, Activity, MoreVertical, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Period = "hoje" | "7dias" | "mes";
type Category = "gastos" | "investimentos" | "retornos";

interface Transaction {
  amount: number;
  transaction_date: string;
  category: string;
  description: string | null;
}

const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  mes: "Mês",
};

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; icon: typeof TrendingDown }> = {
  gastos: { label: "Gastos", color: "hsl(0, 80%, 60%)", icon: TrendingDown },
  investimentos: { label: "Investimentos", color: "hsl(210, 80%, 60%)", icon: BarChart3 },
  retornos: { label: "Retornos", color: "hsl(140, 70%, 50%)", icon: TrendingUp },
};

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

const GraficosPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("mes");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailCategory, setDetailCategory] = useState<Category | "geral" | null>(null);

  // Daily limit state
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [showLimitForm, setShowLimitForm] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitExceededOpen, setLimitExceededOpen] = useState(false);
  const [todaySpending, setTodaySpending] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchDailyLimit();
    }
  }, [user, period]);

  const fetchDailyLimit = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("daily_spending_limit")
      .eq("user_id", user!.id)
      .maybeSingle();
    setDailyLimit((data as any)?.daily_spending_limit ?? null);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: string;

    if (period === "hoje") {
      startDate = now.toISOString().split("T")[0];
    } else if (period === "7dias") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split("T")[0];
    } else {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const { data } = await supabase
      .from("transactions")
      .select("amount, transaction_date, category, description")
      .eq("user_id", user!.id)
      .gte("transaction_date", startDate)
      .order("transaction_date", { ascending: true });

    const txns = (data as Transaction[]) || [];
    setTransactions(txns);
    setLoading(false);

    // Check daily limit
    const today = new Date().toISOString().split("T")[0];
    const todayGastos = txns
      .filter((t) => t.category === "gastos" && t.transaction_date === today)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    setTodaySpending(todayGastos);
  };

  // Check if limit exceeded whenever todaySpending or dailyLimit changes
  useEffect(() => {
    if (dailyLimit && todaySpending > dailyLimit) {
      setLimitExceededOpen(true);
    }
  }, [todaySpending, dailyLimit]);

  const saveDailyLimit = async () => {
    setSavingLimit(true);
    const val = parseCurrency(limitInput);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_spending_limit: val } as any)
      .eq("user_id", user!.id);
    if (error) {
      toast.error("Erro ao salvar limite");
    } else {
      setDailyLimit(val);
      toast.success(val ? `Limite diário definido: ${formatBRL(val)}` : "Limite diário removido");
      setShowLimitForm(false);
      setLimitInput("");
    }
    setSavingLimit(false);
  };

  const buildChartData = (category: Category) => {
    const now = new Date();
    // Gastos chart includes investimentos too (investments are also expenses)
    const filtered = category === "gastos"
      ? transactions.filter((t) => t.category === "gastos" || t.category === "investimentos")
      : transactions.filter((t) => t.category === category);
    const dateMap: Record<string, number> = {};

    if (period === "hoje") {
      const key = now.toISOString().split("T")[0];
      dateMap[key] = 0;
    } else {
      const start = period === "7dias"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = now;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dateMap[d.toISOString().split("T")[0]] = 0;
      }
    }

    filtered.forEach((t) => {
      if (dateMap[t.transaction_date] !== undefined) {
        dateMap[t.transaction_date] += Number(t.amount);
      } else {
        dateMap[t.transaction_date] = Number(t.amount);
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: date.slice(5).replace("-", "/"),
        total,
      }));
  };

  const totals = useMemo(() => {
    const result: Record<Category, number> = { gastos: 0, investimentos: 0, retornos: 0 };
    transactions.forEach((t) => {
      if (result[t.category as Category] !== undefined) {
        result[t.category as Category] += Number(t.amount);
      }
    });
    // Gastos includes investimentos (investments are also expenses)
    result.gastos += result.investimentos;
    return result;
  }, [transactions]);

  // Get detail transactions for the selected category
  const detailTransactions = useMemo(() => {
    if (!detailCategory) return [];
    if (detailCategory === "gastos") {
      return transactions.filter((t) => t.category === "gastos" || t.category === "investimentos");
    }
    if (detailCategory === "geral") {
      // Show all unique transactions (don't double-count)
      return transactions;
    }
    return transactions.filter((t) => t.category === detailCategory);
  }, [detailCategory, transactions]);

  const generalChartData = useMemo(() => {
    const now = new Date();
    const dateMap: Record<string, { gains: number; expenses: number }> = {};

    if (period === "hoje") {
      const key = now.toISOString().split("T")[0];
      dateMap[key] = { gains: 0, expenses: 0 };
    } else {
      const start = period === "7dias"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
        dateMap[d.toISOString().split("T")[0]] = { gains: 0, expenses: 0 };
      }
    }

    transactions.forEach((t) => {
      const key = t.transaction_date;
      if (!dateMap[key]) dateMap[key] = { gains: 0, expenses: 0 };
      if (t.category === "retornos") {
        dateMap[key].gains += Number(t.amount);
      } else {
        dateMap[key].expenses += Number(t.amount);
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { gains, expenses }]) => ({
        date: date.slice(5).replace("-", "/"),
        net: gains - expenses,
      }));
  }, [transactions, period]);

  return (
    <div className="flex flex-col gap-5 px-4 py-5 max-w-lg mx-auto">
      {/* Period selector */}
      <div className="flex gap-2 justify-center">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p
                ? "bg-primary text-primary-foreground neon-glow"
                : "bg-secondary border border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Daily limit button */}
      <div className="space-y-2">
        <button
          onClick={() => {
            setShowLimitForm(!showLimitForm);
            if (!showLimitForm && dailyLimit) {
              setLimitInput(formatBRL(dailyLimit));
            }
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Programar limite diário</span>
          </div>
          {dailyLimit ? (
            <span className="text-xs font-semibold text-primary">{formatBRL(dailyLimit)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Não definido</span>
          )}
        </button>

        {showLimitForm && (
          <div className="flex items-center gap-2 px-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={limitInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                if (raw.length <= 12) setLimitInput(raw ? formatCurrencyInput(raw) : "");
              }}
              className="h-9 text-sm bg-secondary border-border"
              autoFocus
            />
            <button
              onClick={saveDailyLimit}
              disabled={savingLimit}
              className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              Salvar
            </button>
            {dailyLimit && (
              <button
                onClick={async () => {
                  await supabase
                    .from("profiles")
                    .update({ daily_spending_limit: null } as any)
                    .eq("user_id", user!.id);
                  setDailyLimit(null);
                  setShowLimitForm(false);
                  setLimitInput("");
                  toast.success("Limite diário removido");
                }}
                className="px-3 h-9 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all"
              >
                Remover
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* General overview chart */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-heading font-semibold text-foreground">Visão Geral</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${
                  generalChartData.reduce((s, d) => s + d.net, 0) >= 0 ? "text-[hsl(140,70%,50%)]" : "text-[hsl(0,80%,60%)]"
                }`}>
                  {formatBRL(generalChartData.reduce((s, d) => s + d.net, 0))}
                </span>
                <button
                  onClick={() => setDetailCategory("geral")}
                  className="p-1 rounded-md hover:bg-secondary transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {generalChartData.length === 0 || generalChartData.every((d) => d.net === 0) ? (
              <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                Nenhum registro no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={generalChartData}>
                  <defs>
                    <linearGradient id="gradient-positive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(140, 70%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(140, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradient-negative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 80%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 80%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatBRL(value), value >= 0 ? "Positivo" : "Negativo"]}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke={generalChartData.reduce((s, d) => s + d.net, 0) >= 0 ? "hsl(140, 70%, 50%)" : "hsl(0, 80%, 60%)"}
                    fill={generalChartData.reduce((s, d) => s + d.net, 0) >= 0 ? "url(#gradient-positive)" : "url(#gradient-negative)"}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {(["gastos", "investimentos", "retornos"] as Category[]).map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const data = buildChartData(cat);
          const Icon = config.icon;

          return (
            <div key={cat} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                  <h3 className="text-sm font-heading font-semibold text-foreground">{config.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: config.color }}>
                    {formatBRL(totals[cat])}
                  </span>
                  <button
                    onClick={() => setDetailCategory(cat)}
                    className="p-1 rounded-md hover:bg-secondary transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {data.length === 0 || data.every((d) => d.total === 0) ? (
                <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                  Nenhum registro no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id={`gradient-${cat}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [formatBRL(value), config.label]}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={config.color}
                      fill={`url(#gradient-${cat})`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
        </>
      )}

      {/* Daily limit exceeded alert */}
      <AlertDialog open={limitExceededOpen} onOpenChange={setLimitExceededOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Limite diário atingido!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você gastou <strong className="text-destructive">{formatBRL(todaySpending)}</strong> hoje, ultrapassando seu limite diário de <strong>{dailyLimit ? formatBRL(dailyLimit) : "—"}</strong>.
              </p>
              <p>
                Manter o controle dos seus gastos é essencial para a sua saúde financeira. Tente evitar novos gastos hoje para manter suas finanças no caminho certo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GraficosPage;
