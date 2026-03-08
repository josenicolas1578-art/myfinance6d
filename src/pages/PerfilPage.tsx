import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const PerfilPage = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-muted-foreground text-sm">{user?.email}</p>
      <Button variant="outline" size="sm" onClick={signOut} className="border-primary/30 text-primary hover:bg-primary/10">
        <LogOut className="w-4 h-4 mr-2" />
        Sair
      </Button>
    </div>
  );
};

export default PerfilPage;
