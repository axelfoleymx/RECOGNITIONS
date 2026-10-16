import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarField from "@/components/StarField";
import { Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_DOMAIN = "@rocketing.agency";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      toast({ title: "Error", description: `Solo emails ${ALLOWED_DOMAIN} pueden registrarse`, variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPendingApproval(true);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email enviado", description: "Revisa tu bandeja de entrada para el enlace de recuperación 📧" });
      setShowForgotPassword(false);
      setForgotEmail("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen space-gradient flex items-center justify-center relative">
      <StarField />
      <div className="glass-card-glow p-8 w-full max-w-md z-10 relative">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rocket className="h-10 w-10 text-primary animate-float" />
          </div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-wider">
            Rocketing Recognitions
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Mission Control Access</p>
        </div>

        {pendingApproval ? (
          <div className="text-center space-y-4 py-6">
            <div className="text-5xl">🕐</div>
            <h2 className="text-lg font-display text-foreground">En espera de aprobación</h2>
            <p className="text-sm text-muted-foreground">
              Tu cuenta ha sido creada exitosamente. Un administrador debe aprobarla antes de que puedas acceder.
            </p>
            <p className="text-xs text-muted-foreground">Te notificaremos cuando tu cuenta esté activa.</p>
            <button onClick={() => setPendingApproval(false)} className="text-sm text-muted-foreground hover:text-primary transition-colors mt-4">
              ← Volver al login
            </button>
          </div>
        ) : showForgotPassword ? (
          <div className="space-y-4">
            <h2 className="text-lg font-display text-foreground text-center">Recuperar Contraseña</h2>
            <p className="text-sm text-muted-foreground text-center">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-foreground">Email</Label>
                <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="tu@rocketing.agency" className="bg-muted/50 border-border" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full btn-space rounded-lg h-11 text-base font-display tracking-wide">
                {loading ? "Enviando..." : "📧 Enviar enlace"}
              </Button>
            </form>
            <button onClick={() => setShowForgotPassword(false)} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Volver al login
            </button>
          </div>
        ) : (
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 mb-4">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground">Email</Label>
                  <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@rocketing.agency" className="bg-muted/50 border-border" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-foreground">Password</Label>
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-muted/50 border-border" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full btn-space rounded-lg h-11 text-base font-display tracking-wide">
                  {loading ? "Launching..." : "🚀 Launch"}
                </Button>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground">Nombre completo</Label>
                  <Input id="signup-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" className="bg-muted/50 border-border" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@rocketing.agency" className="bg-muted/50 border-border" required />
                  <p className="text-xs text-muted-foreground">Solo emails {ALLOWED_DOMAIN}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-muted/50 border-border" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full btn-space rounded-lg h-11 text-base font-display tracking-wide">
                  {loading ? "Registrando..." : "🚀 Registrarse"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Login;
