import { motion } from "framer-motion";
import ClimateMeter from "@/components/game/ClimateMeter";
import { SelfCheckin, SpeedId, SPEEDS } from "@/lib/gamification";

/** Anonymous team climate (moods) as the headline; speed and blockers as context. */
const PulsePhase = ({ checkins }: { checkins: SelfCheckin[] }) => {
  const moodCounts: Record<number, number> = {};
  checkins.forEach((c) => {
    if (c.mood) moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
  });
  const speeds = (Object.keys(SPEEDS) as SpeedId[]).map((id) => ({ id, n: checkins.filter((c) => c.speed === id).length }));
  const blockers: Record<string, number> = {};
  checkins.forEach((c) => c.blockers?.forEach((b) => (blockers[b] = (blockers[b] || 0) + 1)));
  const topBlockers = Object.entries(blockers).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <motion.div className="flex flex-col items-center justify-center h-full px-6 md:px-12 gap-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center">
        <p className="hud-label text-neon">Autoevaluación · anónimo</p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-gold-gradient">¿Cómo nos sentimos esta semana?</h2>
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="w-full max-w-3xl">
        <ClimateMeter counts={moodCounts} size="xl" />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="flex flex-wrap justify-center gap-3">
        {speeds.map(({ id, n }) => (
          <span key={id} className="chip bg-muted/60 text-foreground px-3 py-1.5 text-sm">
            {SPEEDS[id].emoji} {SPEEDS[id].label} · {n}
          </span>
        ))}
        {topBlockers.map(([b, n]) => (
          <span key={b} className="chip bg-destructive/15 text-destructive border border-destructive/30 px-3 py-1.5 text-sm">
            Nos frenó: {b} · {n}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default PulsePhase;
