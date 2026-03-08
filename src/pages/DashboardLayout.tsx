import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SideMenu, { type ChatTopic } from "@/components/SideMenu";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import logoImg from "@/assets/logo.png";
import { Menu, X, Instagram } from "lucide-react";

const DashboardLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [chatTopic, setChatTopic] = useState<ChatTopic>("gastos");
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname === "/dashboard/chat";

  useEffect(() => {
    const seen = localStorage.getItem("myfinance_tutorial_done");
    if (!seen) setShowTutorial(true);
  }, []);

  const completeTutorial = () => {
    localStorage.setItem("myfinance_tutorial_done", "true");
    setShowTutorial(false);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card px-4">
        <div className="flex items-center justify-between h-14 max-w-lg mx-auto">
          {isChatPage ? (
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <button
            onClick={() => setAboutOpen(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-base font-heading font-bold text-primary neon-text">My Finance</span>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 flex items-center justify-center bg-background">
              <img src={logoImg} alt="My Finance" className="w-5 h-5 object-contain" />
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
                <img src={logoImg} alt="My Finance" className="w-9 h-9 object-contain" />
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

      <main className="flex-1 overflow-y-auto pb-16">
        {isChatPage ? <Outlet context={{ chatTopic }} /> : <Outlet />}
      </main>

      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
