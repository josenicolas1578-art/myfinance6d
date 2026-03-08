import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!isLogin && !name.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Left side - Desktop branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px]" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-primary/30 neon-glow flex items-center justify-center bg-background">
              <img src={logoImg} alt="My Finance Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-4xl font-heading font-bold text-primary neon-text">My Finance</h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Organize suas finanças de forma simples e inteligente.
          </p>
        </div>
      </div>

      {/* Right / Main - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 sm:p-12">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 mb-5 lg:hidden">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 neon-glow flex items-center justify-center bg-background">
              <img src={logoImg} alt="My Finance Logo" className="w-14 h-14 object-contain" />
            </div>
            <span className="text-xl font-heading font-bold text-primary neon-text">My Finance</span>
          </div>

          {/* Card */}
          <div className="w-full rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4">
              <h2 className="text-xl font-heading font-semibold text-foreground">
                {isLogin ? "Bem-vindo de volta" : "Criar conta"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isLogin
                  ? "Entre com seu e-mail e senha"
                  : "Preencha os dados para criar sua conta"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Como quer ser chamado?</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-10 bg-secondary border-border focus:border-primary focus:ring-primary text-sm"
                      required={!isLogin}
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-secondary border-border focus:border-primary focus:ring-primary text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-secondary border-border focus:border-primary focus:ring-primary text-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold text-sm"
                disabled={loading}
              >
                {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin
                  ? "Não tem conta? Criar conta"
                  : "Já tem conta? Fazer login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
