import { motion } from "framer-motion";
import PlayerAvatar from "@/components/game/PlayerAvatar";
import { firstName, GamePerson, Milestone, milestoneKind } from "@/lib/gamification";

interface MilestonesPhaseProps {
  milestones: Milestone[];
  peopleById: Record<string, GamePerson>;
}

const MAX = 9;

const MilestonesPhase = ({ milestones, peopleById }: MilestonesPhaseProps) => {
  const shown = [...milestones].sort((a, b) => b.impact - a.impact).slice(0, MAX);
  const people = new Set(milestones.flatMap((m) => m.participants)).size;

  return (
    <motion.div className="flex flex-col items-center justify-center h-full px-6 md:px-12 py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <p className="hud-label text-neon mb-1">Bitácora de misión</p>
      <h2 className="font-display text-3xl md:text-5xl font-black text-gold-gradient text-center">Hitos de la Semana</h2>
      <p className="font-hud text-muted-foreground mt-1 mb-8">
        {milestones.length} hitos · {people} personas involucradas
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        {shown.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="glass-card-glow p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="chip bg-muted/60 text-foreground">
                {milestoneKind(m.kind).emoji} {milestoneKind(m.kind).label}
              </span>
              <span>{"🚀".repeat(m.impact)}</span>
            </div>
            <p className="font-semibold text-lg leading-snug">{m.title}</p>
            {m.description && <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
            <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
              {m.participants.map((pid) =>
                peopleById[pid] ? (
                  <span key={pid} className="flex items-center gap-1 rounded-full bg-muted/50 pl-0.5 pr-2 py-0.5">
                    <PlayerAvatar name={peopleById[pid].name} photoUrl={peopleById[pid].photo_url} size={22} ring="none" />
                    <span className="text-xs">{firstName(peopleById[pid].name)}</span>
                  </span>
                ) : null,
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {milestones.length > MAX && <p className="text-muted-foreground mt-4 text-sm">+{milestones.length - MAX} hitos más</p>}
    </motion.div>
  );
};

export default MilestonesPhase;
