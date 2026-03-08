import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import logoImg from "@/assets/logo.png";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="My Finance" className="w-8 h-8 object-contain" />
            <span className="text-lg font-heading font-bold text-primary neon-text">My Finance</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="border-primary/30 text-primary hover:bg-primary/10">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-4">
            Bem-vindo ao My Finance! 🎉
          </h1>
          <p className="text-lg text-muted-foreground">
            Sua conta está pronta. Em breve, novas funcionalidades serão adicionadas aqui.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
