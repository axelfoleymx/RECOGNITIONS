import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Rocket, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WinnerClosing {
  name: string;
  reasons: string[];
}

interface ClosingPhaseProps {
  weekId: string;
  winners: WinnerClosing[];
  onClose: () => void;
}

const ClosingPhase = ({ weekId, winners, onClose }: ClosingPhaseProps) => {
  const { toast } = useToast();
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const isTie = winners.length > 1;
  const allNames = winners.map((w) => w.name);
  const displayName = isTie
    ? allNames.slice(0, -1).join(", ") + " y " + allNames[allNames.length - 1]
    : allNames[0] || "";
  const hasReasons = winners.some((w) => w.reasons.length > 0);
  let animIndex = 0;

  const handleReleaseDiplomas = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReleasing(true);
    try {
      const { error } = await supabase
        .from("weeks")
        .update({ diplomas_released: true } as any)
        .eq("id", weekId);
      if (error) throw error;
      setReleased(true);
      toast({ title: "🚀 ¡Diplomas liberados!", description: "Todos pueden ver sus diplomas ahora" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  const totalReasons = winners.reduce((sum, w) => sum + w.reasons.length, 0);

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-8 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h1
        className="font-display text-4xl md:text-6xl text-center"
        style={{
          color: "hsl(var(--star-gold))",
          textShadow: "0 0 30px hsl(var(--star-gold) / 0.4)",
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" }}
      >
        🎉 ¡Felicidades {displayName}! 🎉
      </motion.h1>

      {hasReasons && (
        <div className="max-w-xl w-full space-y-3 max-h-[40vh] overflow-y-auto">
          <p className="text-center text-muted-foreground text-sm uppercase tracking-widest mb-4">
            Lo que dijeron de {isTie ? "ustedes" : "ti"}
          </p>
          {isTie ? (
            winners.map((winner) => {
              const filtered = winner.reasons.filter((r) => r.trim().length > 0);
              if (filtered.length === 0) return null;
              return (
                <div key={winner.name} className="space-y-2 mb-4">
                  <p className="text-center text-sm font-semibold" style={{ color: "hsl(var(--star-gold))" }}>
                    Para {winner.name}:
                  </p>
                  {filtered.map((reason, i) => {
                    const idx = animIndex++;
                    return (
                      <motion.div
                        key={idx}
                        className="glass-card p-4 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.5 }}
                      >
                        <p className="text-foreground/90 italic">"{reason}"</p>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            winners[0]?.reasons.map((reason, i) => (
              <motion.div
                key={i}
                className="glass-card p-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.5 }}
              >
                <p className="text-foreground/90 italic">"{reason}"</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      <motion.div
        className="flex gap-3 items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: totalReasons * 0.5 + 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          onClick={handleReleaseDiplomas}
          disabled={released || releasing}
          size="lg"
          className="gap-2 mt-4"
        >
          {released ? (
            <>
              <Check className="h-4 w-4" /> Diplomas Liberados
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" /> {releasing ? "Liberando..." : "Liberar Diplomas 🚀"}
            </>
          )}
        </Button>
        <Button onClick={onClose} variant="outline" size="lg" className="gap-2 mt-4">
          <X className="h-4 w-4" /> Cerrar
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default ClosingPhase;
