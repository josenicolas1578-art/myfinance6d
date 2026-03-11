// DashboardLayout
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SideMenu, { type ChatTopic } from "@/components/SideMenu";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import TransactionHistoryDialog from "@/components/TransactionHistoryDialog";
import { useRealtimeBalance } from "@/hooks/useRealtimeBalance";
import { useAuth } from "@/contexts/AuthContext";

import appIcon from "@/assets/app-icon.png";
import { Menu, X, Instagram, Wallet, Eye, EyeOff } from "lucide-react";

const DashboardLayout = () => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(() => {
    return localStorage.getItem("myfinance_balance_hidden") === "true";
  });
  const [chatTopic, setChatTopic] = useState<ChatTopic>("geral");
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isChatPage = location.pathname === "/dashboard/chat";

  useEffect(() => {
    if (!user) return;
    const checkTutorial = async () => {
      const key = `myfinance_tutorial_done_${user.id}`;
      const seen = localStorage.getItem(key);
      if (!seen) setShowTutorial(true);
    };
    checkTutorial();
  }, [user]);

  const completeTutorial = async () => {
    if (user) {
      localStorage.setItem(`myfinance_tutorial_done_${user.id}`, "true");
    }
    setShowTutorial(false);
    navigate("/dashboard/chat");
  };

  const { balance, balanceFormatted } = useRealtimeBalance();

  const toggleBalanceVisibility = () => {
    const newValue = !balanceHidden;
    setBalanceHidden(newValue);
    localStorage.setItem("myfinance_balance_hidden", String(newValue));
    window.dispatchEvent(new Event("balanceVisibilityChanged"));
  };

  const maskedBalance = balanceFormatted.replace(/[\d]/g, (_, i) => {
    return "*";
  }).replace(/,\*\*/g, ",**");

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden">
      {showTutorial && <OnboardingTutorial onComplete={completeTutorial} />}

      <BottomNav onAboutClick={() => setAboutOpen(true)} />

      {/* Main content area - offset on desktop for sidebar */}
      <div className="flex flex-col flex-1 lg:ml-56 min-h-0 overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Header */}
        <header className="shrink-0 border-b border-border bg-card px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center justify-between h-14 w-full">
            <div className="flex items-center gap-2">
              {isChatPage && (
                <button
                  onClick={() => setMenuOpen(true)}
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {balanceHidden ? maskedBalance : balanceFormatted}
                </span>
              </button>
              <button
                onClick={toggleBalanceVisibility}
                className="text-primary/60 hover:text-primary transition-colors"
              >
                {balanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Mobile only - right side branding */}
            <button
              onClick={() => setAboutOpen(true)}
              className="flex lg:hidden items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-base font-heading font-bold text-primary neon-text">My Finance</span>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 flex items-center justify-center bg-background">
                <img src={appIcon} alt="My Finance" className="w-5 h-5 object-contain" />
              </div>
            </button>
          </div>
        </header>

        {/* About popup */}
        {aboutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setAboutOpen(false)}>
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <div
              className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-xs shadow-lg shadow-primary/10 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setAboutOpen(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/40 neon-glow flex items-center justify-center bg-background">
                  <img src={appIcon} alt="My Finance" className="w-9 h-9 object-contain" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-heading font-bold text-primary neon-text">My Finance</h3>
                  <p className="text-xs text-muted-foreground">Seu assistente financeiro inteligente</p>
                </div>
                <div className="w-full h-px bg-border" />
                <div className="space-y-2">
                  <p className="text-sm text-foreground">Criado e programado por</p>
                  <a
                    href="https://www.instagram.com/nicolas.nzk?igsh=MTJ0OWt4OWN6NGZ1Mw%3D%3D&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    @nicolas.nzk
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {isChatPage && (
          <SideMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            activeTopic={chatTopic}
            onSelectTopic={setChatTopic}
          />
        )}

        <main className={`flex-1 min-h-0 ${isChatPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {isChatPage ? <Outlet context={{ chatTopic }} /> : <Outlet />}
        </main>
      </div>

      <TransactionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
};

export default DashboardLayout;
