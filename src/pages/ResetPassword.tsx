import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StarField from "@/components/StarField";
import { Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Check if already in recovery (hash contains type=recovery)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Contraseña actualizada!", description: "Ya puedes iniciar sesión con tu nueva contraseña" });
      await supabase.auth.signOut();
      navigate("/login");
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
            Nueva Contraseña
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Establece tu nueva contraseña</p>
        </div>

        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">Nueva contraseña</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-muted/50 border-border" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirmar contraseña</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" className="bg-muted/50 border-border" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-space rounded-lg h-11 text-base font-display tracking-wide">
              {loading ? "Actualizando..." : "🔑 Actualizar Contraseña"}
            </Button>
          </form>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Verificando enlace de recuperación...</p>
            <p className="text-xs mt-2">Si el enlace no funciona, solicita uno nuevo desde el login.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
