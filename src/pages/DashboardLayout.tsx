import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import logoImg from "@/assets/logo.png";

const DashboardLayout = () => {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4">
        <div className="flex items-center gap-3 h-14 max-w-lg mx-auto">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 flex items-center justify-center bg-background">
            <img src={logoImg} alt="My Finance" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-base font-heading font-bold text-primary neon-text">My Finance</span>
        </div>
      </header>

      {/* Content - padded for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
