import { useState } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SideMenu from "@/components/SideMenu";
import logoImg from "@/assets/logo.png";
import { Menu } from "lucide-react";

const DashboardLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4">
        <div className="flex items-center justify-between h-14 max-w-lg mx-auto">
          {/* Menu button - left */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo + name - right */}
          <div className="flex items-center gap-2">
            <span className="text-base font-heading font-bold text-primary neon-text">My Finance</span>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 flex items-center justify-center bg-background">
              <img src={logoImg} alt="My Finance" className="w-5 h-5 object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Side menu */}
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
