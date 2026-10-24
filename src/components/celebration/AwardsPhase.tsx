import { motion, AnimatePresence } from "framer-motion";
import Trophy from "@/components/game/Trophy";
import PlayerAvatar from "@/components/game/PlayerAvatar";
import Confetti from "./Confetti";
import { AwardCategory, AwardStanding, GamePerson, pillarOf } from "@/lib/gamification";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export type AwardResult = { category: AwardCategory; standings: AwardStanding[] };

interface AwardsPhaseProps {
  results: AwardResult[];
  /** -1 = overview of all trophies, 0..n-1 = reveal of each award */
  index: number;
  peopleById: Record<string, GamePerson>;
}

const AwardsPhase = ({ results, index, peopleById }: AwardsPhaseProps) => {
  if (index < 0) {
    return (
      <motion.div className="flex flex-col items-center justify-center h-full px-8 gap-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="text-center">
          <p className="hud-label text-neon">Mini-awards</p>
          <h2 className="font-display text-4xl md:text-6xl font-black text-gold-gradient">Premios de la Semana</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {results.map((r, i) => (
            <motion.div
              key={r.category.id}
              className="flex flex-col items-center w-40 text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i, type: "spring", stiffness: 140, damping: 14 }}
            >
              <Trophy size={100} emoji={r.category.emoji} />
              <p className="font-display text-sm text-foreground mt-2">{r.category.name}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  const r = results[index];
  if (!r) return null;
  const top = r.standings[0];
  const winners = top ? r.standings.filter((s) => s.rockets === top.rockets && s.votes === top.votes) : [];
  const runnersUp = r.standings.filter((s) => !winners.includes(s)).slice(0, 3);
  const pillar = pillarOf(r.category.pillar);

  return (
    <motion.div key={r.category.id} className="flex flex-col items-center justify-center h-full px-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Confetti key={r.category.id} count={60} />
      <span className="chip mb-3" style={{ background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }}>
        {pillar.emoji} {pillar.label} · Premio {index + 1} de {results.length}
      </span>
      <h2 className="font-display text-3xl md:text-5xl font-black text-gold-gradient text-center">{r.category.name}</h2>
      <p className="text-muted-foreground mt-2 text-center max-w-xl">{r.category.description}</p>

      <div className="relative mt-8 flex items-end justify-center gap-6">
        {winners.length === 0 ? (
          <div className="flex flex-col items-center">
            <Trophy size={170} emoji={r.category.emoji} />
            <p className="text-muted-foreground mt-4">Sin votos esta semana</p>
          </div>
        ) : (
          winners.map((w, i) => {
            const person = peopleById[w.personId];
            return (
              <div key={w.personId} className="flex flex-col items-center">
                <div className="relative">
                  <Trophy size={winners.length > 1 ? 140 : 180} active />
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 top-6"
                    initial={{ y: -400, scale: 0.4, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    transition={{ delay: 1 + i * 0.3, type: "spring", stiffness: 140, damping: 13 }}
                  >
                    <PlayerAvatar name={person?.name || "?"} photoUrl={person?.photo_url} size={winners.length > 1 ? 80 : 104} ring="gold" />
                  </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 + i * 0.3 }} className="text-center mt-3">
                  <p className="font-display text-2xl md:text-3xl text-foreground">{person?.name}</p>
                  <p className="font-hud text-primary mt-1">
                    {fmt(w.rockets)} 🚀 · {w.votes} voto{w.votes !== 1 && "s"}
                  </p>
                  {w.reasons[0] && <p className="italic text-sm text-foreground/80 mt-2 max-w-sm">“{w.reasons[0]}”</p>}
                </motion.div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {runnersUp.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="flex flex-wrap justify-center gap-3 mt-8 px-4">
            {runnersUp.map((s) => {
              const person = peopleById[s.personId];
              return (
                <div key={s.personId} className="glass-card px-3 py-2 flex items-center gap-2">
                  <PlayerAvatar name={person?.name || "?"} photoUrl={person?.photo_url} size={30} ring="none" />
                  <span className="text-sm">{person?.name.split(" ")[0]}</span>
                  <span className="font-hud text-xs text-muted-foreground">{fmt(s.rockets)}🚀</span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AwardsPhase;
