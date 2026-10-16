import { motion } from "framer-motion";
import { SelfCheckin, SpeedId, SPEEDS } from "@/lib/gamification";

/** Anonymous team self-evaluation: counts per speed + most common blockers. */
const PulsePhase = ({ checkins }: { checkins: SelfCheckin[] }) => {
  const counts = (Object.keys(SPEEDS) as SpeedId[]).map((id) => ({ id, n: checkins.filter((c) => c.speed === id).length }));
  const blockers: Record<string, number> = {};
  checkins.forEach((c) => c.blockers?.forEach((b) => (blockers[b] = (blockers[b] || 0) + 1)));
  const topBlockers = Object.entries(blockers).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <motion.div className="flex flex-col items-center justify-center h-full px-8 gap-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center">
        <p className="hud-label text-neon">Autoevaluación · {checkins.length} respuestas</p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-gold-gradient">¿A qué velocidad volamos?</h2>
      </div>
      <div className="grid grid-cols-3 gap-6 md:gap-10">
        {counts.map(({ id, n }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.25, type: "spring", stiffness: 140, damping: 13 }}
            className="glass-card-glow px-6 md:px-10 py-6 flex flex-col items-center"
          >
            <span className="text-5xl md:text-7xl">{SPEEDS[id].emoji}</span>
            <span className="font-display text-5xl md:text-7xl mt-2" style={{ color: `hsl(${SPEEDS[id].hue})` }}>
              {n}
            </span>
            <span className="font-hud text-sm text-muted-foreground mt-1 text-center">{SPEEDS[id].label}</span>
          </motion.div>
        ))}
      </div>
      {topBlockers.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="text-center">
          <p className="hud-label mb-2">Lo que más nos frenó</p>
          <div className="flex flex-wrap justify-center gap-2">
            {topBlockers.map(([b, n]) => (
              <span key={b} className="chip bg-destructive/15 text-destructive border border-destructive/30 px-3 py-1.5 text-sm">
                {b} · {n}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PulsePhase;
