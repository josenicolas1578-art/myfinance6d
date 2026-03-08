import { useEffect } from "react";
import { X } from "lucide-react";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

const SideMenu = ({ open, onClose }: SideMenuProps) => {
  // Lock body scroll when open
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
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-1/2 max-w-xs bg-card border-r border-border shadow-elevated transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="text-sm font-heading font-semibold text-foreground">Menu</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground">Em breve, novas opções aqui...</p>
        </div>
      </div>
    </>
  );
};

export default SideMenu;
