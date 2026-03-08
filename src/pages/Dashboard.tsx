import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { TrendingUp, LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground">My Finance</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
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
