import { useEffect } from "react";
import { X, DollarSign, TrendingUp, RotateCcw } from "lucide-react";

export type ChatTopic = "gastos" | "investimentos" | "retornos";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  activeTopic: ChatTopic;
  onSelectTopic: (topic: ChatTopic) => void;
}

const topics: { id: ChatTopic; label: string; icon: typeof DollarSign; description: string }[] = [
  { id: "gastos", label: "Gastos", icon: DollarSign, description: "Controle de despesas e gastos" },
  { id: "investimentos", label: "Investimentos", icon: TrendingUp, description: "Dicas e análise de investimentos" },
  { id: "retornos", label: "Retornos", icon: RotateCcw, description: "Acompanhamento de retornos" },
];

const SideMenu = ({ open, onClose, activeTopic, onSelectTopic }: SideMenuProps) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 z-50 h-full w-1/2 max-w-xs bg-card border-r border-border shadow-elevated transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="text-sm font-heading font-semibold text-foreground">Chats</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-1">
          {topics.map((topic) => {
            const isActive = activeTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  onSelectTopic(topic.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <topic.icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{topic.label}</p>
                  <p className="text-[10px] opacity-70 truncate">{topic.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SideMenu;
