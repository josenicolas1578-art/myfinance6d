import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, BarChart3 } from "lucide-react";

type Period = "hoje" | "7dias" | "mes";
type Category = "gastos" | "investimentos" | "retornos";

interface Transaction {
  amount: number;
  transaction_date: string;
  category: string;
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

const GraficosPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("mes");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user, period]);

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
      .select("amount, transaction_date, category")
      .eq("user_id", user!.id)
      .gte("transaction_date", startDate)
      .order("transaction_date", { ascending: true });

    setTransactions((data as Transaction[]) || []);
    setLoading(false);
  };

  const buildChartData = (category: Category) => {
    const now = new Date();
    const filtered = transactions.filter((t) => t.category === category);
    const dateMap: Record<string, number> = {};

    // Initialize all dates in range
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

    // Sum amounts per day
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
    return result;
  }, [transactions]);

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        (["gastos", "investimentos", "retornos"] as Category[]).map((cat) => {
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
                <span className="text-sm font-bold" style={{ color: config.color }}>
                  {formatBRL(totals[cat])}
                </span>
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
        })
      )}
    </div>
  );
};

export default GraficosPage;
