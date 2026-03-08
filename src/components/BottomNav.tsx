import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, BarChart3, FileText, UserCircle } from "lucide-react";

const tabs = [
  { id: "chat", label: "Chat", icon: MessageCircle, path: "/dashboard/chat" },
  { id: "graficos", label: "Gráficos", icon: BarChart3, path: "/dashboard/graficos" },
  { id: "resumos", label: "Resumos", icon: FileText, path: "/dashboard/resumos" },
  { id: "perfil", label: "Perfil", icon: UserCircle, path: "/dashboard/perfil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/70"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_hsl(205,100%,55%,0.6)]" : ""}`} />
              <span className={`text-[11px] font-medium ${isActive ? "neon-text" : ""}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
