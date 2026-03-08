import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formatBRL = (value: number | null | undefined) => {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function useRealtimeBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    supabase
      .from("profiles")
      .select("current_balance")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setBalance(data?.current_balance ?? null);
      });

    // Realtime subscription
    const channel = supabase
      .channel("balance-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newBalance = (payload.new as any).current_balance;
          setBalance(newBalance ?? null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { balance, balanceFormatted: formatBRL(balance) };
}
