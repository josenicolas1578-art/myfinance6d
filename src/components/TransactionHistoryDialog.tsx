import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  created_at: string;
};

interface TransactionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryConfig: Record<string, { label: string; icon: typeof ArrowDownCircle; colorClass: string }> = {
  gastos: { label: "Gasto", icon: ArrowDownCircle, colorClass: "text-destructive" },
  retornos: { label: "Retorno", icon: ArrowUpCircle, colorClass: "text-green-500" },
  investimentos: { label: "Investimento", icon: TrendingUp, colorClass: "text-blue-500" },
};

const TransactionHistoryDialog = ({ open, onOpenChange }: TransactionHistoryDialogProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("transactions")
      .select("id, amount, category, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setTransactions((data as Transaction[]) || []);
        setLoading(false);
      });
  }, [open, user]);

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-heading text-foreground">
            Histórico de Movimentações
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            transactions.map((t) => {
              const config = categoryConfig[t.category] || categoryConfig.gastos;
              const Icon = config.icon;
              const dateStr = format(new Date(t.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
                >
                  <Icon className={`w-5 h-5 shrink-0 ${config.colorClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.description || config.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{dateStr}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${config.colorClass}`}>
                    {t.category === "retornos" ? "+" : "-"}{formatBRL(t.amount)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionHistoryDialog;
