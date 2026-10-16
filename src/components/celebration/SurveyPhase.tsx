import { motion } from "framer-motion";
import PlayerAvatar from "@/components/game/PlayerAvatar";
import { GamePerson, pillarOf, SURVEY_QUESTIONS, SurveyStanding } from "@/lib/gamification";

interface SurveyPhaseProps {
  index: number;
  standings: SurveyStanding[];
  peopleById: Record<string, GamePerson>;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** One slide per survey question: animated ranking bars (external + ½ self). */
const SurveyPhase = ({ index, standings, peopleById }: SurveyPhaseProps) => {
  const q = SURVEY_QUESTIONS[index];
  if (!q) return null;
  const top = standings.slice(0, 5);
  const rest = standings.slice(5);
  const max = top[0]?.points || 1;
  const pillar = pillarOf(q.pillar);
  const featured = top.flatMap((s) => s.comments.map((c) => ({ c, id: s.personId })))[0];

  return (
    <motion.div className="flex flex-col items-center justify-center h-full px-6 md:px-16 py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <span className="chip mb-3" style={{ background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }}>
        Recognitions · pregunta {index + 1} de {SURVEY_QUESTIONS.length}
      </span>
      <h2 className="font-display text-2xl md:text-5xl font-black text-gold-gradient text-center max-w-5xl leading-tight">
        {q.emoji} {q.question}
      </h2>

      <div className="w-full max-w-4xl mt-10 space-y-3">
        {top.length === 0 && <p className="text-center text-muted-foreground">Nadie fue mencionado en esta pregunta.</p>}
        {top.map((s, i) => {
          const person = peopleById[s.personId];
          return (
            <motion.div
              key={s.personId}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + (top.length - i) * 0.25, type: "spring", stiffness: 120, damping: 15 }}
              className="flex items-center gap-4"
            >
              <span className="w-10 text-3xl text-center">{MEDALS[i] || <span className="font-display text-xl text-muted-foreground">{i + 1}</span>}</span>
              <PlayerAvatar name={person?.name || "?"} photoUrl={person?.photo_url} size={i === 0 ? 64 : 52} ring={i === 0 ? "gold" : "cyan"} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={i === 0 ? "font-display text-xl md:text-2xl" : "font-display text-base md:text-lg"}>{person?.name}</p>
                  <p className="font-hud text-sm text-primary shrink-0">
                    {fmt(s.points)} pts · {s.votes} voto{s.votes !== 1 && "s"}
                    {s.selfPoints > 0 && <span className="text-muted-foreground"> · auto {fmt(s.selfPoints)}</span>}
                  </p>
                </div>
                <div className="h-3 rounded-full bg-muted/60 mt-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: i === 0 ? "linear-gradient(90deg, hsl(var(--gold-deep)), hsl(var(--gold-light)))" : `linear-gradient(90deg, hsl(${pillar.hue} / 0.6), hsl(${pillar.hue}))` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.points / max) * 100}%` }}
                    transition={{ delay: 0.5 + (top.length - i) * 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="flex flex-wrap justify-center gap-2 mt-6 max-w-4xl">
          <span className="hud-label self-center">También mencionados:</span>
          {rest.map((s) => (
            <span key={s.personId} className="flex items-center gap-1.5 rounded-full bg-muted/50 pl-0.5 pr-2.5 py-0.5">
              <PlayerAvatar name={peopleById[s.personId]?.name || "?"} photoUrl={peopleById[s.personId]?.photo_url} size={22} ring="none" />
              <span className="text-xs">{peopleById[s.personId]?.name.split(" ")[0]}</span>
            </span>
          ))}
        </motion.div>
      )}

      {featured && (
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.3 }} className="mt-8 italic text-foreground/85 text-center max-w-2xl">
          “{featured.c}” <span className="not-italic text-muted-foreground text-sm">— para {peopleById[featured.id]?.name.split(" ")[0]}</span>
        </motion.p>
      )}
    </motion.div>
  );
};

export default SurveyPhase;
