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
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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

      {/* Desktop sidebar nav */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-56 flex-col border-r border-border bg-card" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-5 py-6 border-b border-border">
          <h1 className="text-lg font-heading font-bold text-primary neon-text">My Finance</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Assistente financeiro</p>
        </div>
        <div className="flex flex-col gap-1 p-3 flex-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <tab.icon className={`w-4.5 h-4.5 ${isActive ? "drop-shadow-[0_0_6px_hsl(205,100%,55%,0.6)]" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
