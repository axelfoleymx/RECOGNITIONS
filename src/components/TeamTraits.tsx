import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const TRAIT_CATALOG = [
  { emoji: "🔭", title: "Exploradores" },
  { emoji: "💡", title: "Innovadores" },
  { emoji: "🚀", title: "Impulsores" },
  { emoji: "⭐", title: "Estrellas en ascenso" },
  { emoji: "🔗", title: "Sincronizados" },
  { emoji: "👨‍🚀", title: "Astronautas Estelares" },
  { emoji: "🛰️", title: "Siempre en órbita" },
  { emoji: "🌌", title: "Soñadores galácticos" },
  { emoji: "☄️", title: "Veloces como cometas" },
  { emoji: "🪐", title: "Gravedad de equipo" },
  { emoji: "🧭", title: "Navegantes cósmicos" },
  { emoji: "🔥", title: "Propulsión pura" },
  { emoji: "🛠️", title: "Ingenieros de ideas" },
  { emoji: "🌠", title: "Cazadores de metas" },
  { emoji: "🤝", title: "Tripulación unida" },
  { emoji: "🎯", title: "Precisión orbital" },
  { emoji: "🌞", title: "Energía solar" },
  { emoji: "📡", title: "Siempre en señal" },
  { emoji: "🧪", title: "Experimentadores" },
  { emoji: "🏆", title: "Misión cumplida" },
  { emoji: "💫", title: "Chispa creativa" },
  { emoji: "🌍", title: "Con impacto real" },
];

interface Trait {
  emoji: string;
  title: string;
  description: string;
}

// Deterministic shuffle so the whole team sees the same set within a week
const seededShuffle = <T,>(arr: T[], seed: number) => {
  const a = [...arr];
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const weekSeed = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));
  return d.getFullYear() * 100 + week;
};

const TeamTraits = () => {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(weekSeed);

  const selected = useMemo(() => seededShuffle(TRAIT_CATALOG, seed).slice(0, 6), [seed]);

  const fetchTraits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { mode: "team-traits", traits: selected },
      });
      if (error) throw error;
      if (data?.traits) {
        setTraits(data.traits);
      } else {
        setTraits(selected.map((t) => ({ ...t, description: "Navegando juntos por el cosmos." })));
      }
    } catch (e) {
      console.error("Error fetching team traits:", e);
      setTraits(selected.map((t) => ({ ...t, description: "Navegando juntos por el cosmos." })));
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchTraits();
  }, [fetchTraits]);

  return (
    <section className="w-full max-w-3xl mx-auto mt-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <h2 className="font-display text-xl md:text-2xl font-bold text-primary tracking-wider mb-2">
          ✨ El equipo Rocketing es...
        </h2>
        <p className="text-muted-foreground text-sm">
          Inspirado en los despegues de nuestro equipo 🚀
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-muted-foreground hover:text-accent gap-1"
          onClick={() => setSeed(Math.floor(Math.random() * 100000))}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Regenerar
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading
          ? selected.map((t, i) => (
              <div key={i} className="glass-card p-4 flex flex-col items-center gap-2">
                <span className="text-2xl">{t.emoji}</span>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          : traits.map((trait, i) => (
              <motion.div
                key={trait.title}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-4 flex flex-col items-center gap-2 text-center hover:scale-[1.03] transition-transform"
              >
                <span className="text-2xl">{trait.emoji}</span>
                <h3 className="font-display text-xs tracking-wider text-accent font-semibold uppercase">
                  {trait.title}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed" style={{ textWrap: "pretty" }}>
                  {trait.description}
                </p>
              </motion.div>
            ))}
      </div>
    </section>
  );
};

export default TeamTraits;
