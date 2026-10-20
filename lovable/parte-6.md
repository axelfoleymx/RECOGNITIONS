# PARTE 6 DE 6 — Rocketing Recognitions 2.0

Ejecuta los pasos de este documento en orden. Copia cada archivo EXACTAMENTE (contenido completo).

Paso 12 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Fases nuevas de la presentación

`WinnerRevealPhase.tsx` reemplaza al actual (agrega el video de YouTube del ganador).

### Archivo: `src/components/celebration/AwardsPhase.tsx`

~~~tsx
import { motion, AnimatePresence } from "framer-motion";
import Trophy from "@/components/game/Trophy";
import PlayerAvatar from "@/components/game/PlayerAvatar";
import Confetti from "./Confetti";
import { AwardCategory, AwardStanding, GamePerson, pillarOf } from "@/lib/gamification";

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
                    {w.rockets} 🚀 · {w.votes} voto{w.votes !== 1 && "s"}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="flex gap-4 mt-8">
            {runnersUp.map((s) => {
              const person = peopleById[s.personId];
              return (
                <div key={s.personId} className="glass-card px-3 py-2 flex items-center gap-2">
                  <PlayerAvatar name={person?.name || "?"} photoUrl={person?.photo_url} size={30} ring="none" />
                  <span className="text-sm">{person?.name.split(" ")[0]}</span>
                  <span className="font-hud text-xs text-muted-foreground">{s.rockets}🚀</span>
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
~~~

### Archivo: `src/components/celebration/MilestonesPhase.tsx`

~~~tsx
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
~~~

### Archivo: `src/components/celebration/PulsePhase.tsx`

~~~tsx
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
~~~

### Archivo: `src/components/celebration/SurveyPhase.tsx`

~~~tsx
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
~~~

### Archivo: `src/components/celebration/WinnerRevealPhase.tsx`

~~~tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink } from "lucide-react";
import Confetti from "./Confetti";
import { youtubeId } from "@/lib/gamification";

interface WinnerEntry {
  name: string;
  photoUrl: string | null;
  voteCount: number;
}

interface WinnerRevealPhaseProps {
  winners: WinnerEntry[];
  /** winner's victory video (YouTube); embedded with autoplay + open link */
  videoUrl?: string | null;
}

const WinnerRevealPhase = ({ winners, videoUrl }: WinnerRevealPhaseProps) => {
  const videoId = youtubeId(videoUrl);
  const [showContent, setShowContent] = useState(false);
  const isTie = winners.length > 1;

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Adjust avatar size based on number of winners
  const avatarSize = isTie
    ? winners.length <= 2
      ? "h-32 w-32 md:h-40 md:w-40"
      : "h-24 w-24 md:h-32 md:w-32"
    : "h-40 w-40 md:h-56 md:w-56";

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Golden flash */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "hsl(var(--star-gold))" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.8 }}
      />

      {showContent && <Confetti count={100} />}

      {showContent && (
        <motion.div
          className="flex flex-col items-center gap-6 z-30"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
        >
          {isTie && (
            <motion.p
              className="font-display text-xl md:text-2xl uppercase tracking-widest text-center"
              style={{ color: "hsl(var(--star-gold))" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ¡Empate!
            </motion.p>
          )}

          <div className={`flex items-center justify-center ${isTie ? "gap-8 md:gap-12 flex-wrap" : ""}`}>
            {winners.map((winner, idx) => (
              <motion.div
                key={idx}
                className="flex flex-col items-center gap-3"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + idx * 0.2 }}
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 30px hsl(45 100% 50% / 0.4)",
                      "0 0 80px hsl(45 100% 50% / 0.7)",
                      "0 0 30px hsl(45 100% 50% / 0.4)",
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="rounded-full p-1"
                  style={{ border: "3px solid hsl(var(--star-gold))" }}
                >
                  <Avatar className={avatarSize}>
                    {winner.photoUrl && <AvatarImage src={winner.photoUrl} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-4xl">
                      {winner.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                <motion.h1
                  className={`font-display text-center ${isTie ? "text-3xl md:text-5xl" : "text-5xl md:text-8xl"}`}
                  style={{
                    color: "hsl(var(--star-gold))",
                    textShadow: "0 0 40px hsl(var(--star-gold) / 0.6)",
                  }}
                >
                  {winner.name}
                </motion.h1>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 + winners.length * 0.2 }}
          >
            <span className="text-4xl">🏆</span>
            <span
              className="font-display text-2xl md:text-3xl"
              style={{ color: "hsl(var(--star-gold))" }}
            >
              {isTie ? "Rocketers de la semana" : "Rocketer de la semana"}
            </span>
          </motion.div>

          {videoId && (
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-card overflow-hidden w-[min(90vw,480px)] aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="Video de victoria"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
              <a
                href={videoUrl!}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                Abrir en YouTube <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default WinnerRevealPhase;
~~~

---

Paso 13 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Presentación completa

Ambos archivos reemplazan a los actuales.

### Archivo: `src/components/celebration/RecognitionsPhase.tsx`

~~~tsx
import { motion, AnimatePresence } from "framer-motion";
import PlayerAvatar from "@/components/game/PlayerAvatar";
import { pillarOf } from "@/lib/gamification";

export interface CelebrationRecognition {
  id: string;
  message: string;
  is_anonymous: boolean;
  recognized_person_id?: string;
  pillar?: string | null;
  question_id?: string | null;
  rating?: number | null;
  people?: { name: string; photo_url: string | null };
  profiles?: { full_name: string } | null;
}

export type RecognitionGroup = {
  key: string;
  name: string;
  photoUrl: string | null;
  count: number;
  pillars: string[];
  quote: string;
  author: string;
};

export const GROUPS_PER_SLIDE = 6;

/** Condenses N recognitions into one card per person (most recognized first). */
export const groupRecognitions = (recs: CelebrationRecognition[]): RecognitionGroup[] => {
  const map = new Map<string, CelebrationRecognition[]>();
  recs.forEach((r) => {
    const key = r.recognized_person_id || r.people?.name || r.id;
    map.set(key, [...(map.get(key) || []), r]);
  });
  return [...map.entries()]
    .map(([key, list]) => {
      // featured quote: the most detailed message
      const best = [...list].sort((a, b) => b.message.length - a.message.length)[0];
      return {
        key,
        name: list[0].people?.name || "?",
        photoUrl: list[0].people?.photo_url ?? null,
        count: list.length,
        pillars: [...new Set(list.map((r) => r.pillar).filter(Boolean) as string[])],
        quote: best.message.length > 160 ? best.message.slice(0, 157).trimEnd() + "…" : best.message,
        author: best.is_anonymous ? "Anónimo" : best.profiles?.full_name || "Anónimo",
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

interface RecognitionsPhaseProps {
  groups: RecognitionGroup[];
  totalRecognitions: number;
  slide: number;
}

const RecognitionsPhase = ({ groups, totalRecognitions, slide }: RecognitionsPhaseProps) => {
  const slides = Math.max(1, Math.ceil(groups.length / GROUPS_PER_SLIDE));
  const page = groups.slice(slide * GROUPS_PER_SLIDE, (slide + 1) * GROUPS_PER_SLIDE);

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-6 md:px-12 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="hud-label text-neon mb-1">🏅 Muro de medallas y comentarios</p>
      <h2 className="font-display text-2xl md:text-4xl font-black text-gold-gradient mb-1 text-center">
        Lo que dijo la tripulación
      </h2>
      <p className="font-hud text-foreground/70 text-sm">
        {totalRecognitions} mensajes · {groups.length} personas
      </p>
      <p className="font-hud text-muted-foreground mb-8 text-sm">
        Página {slide + 1} de {slides}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.45 }}
        >
          {page.map((g, i) => (
            <motion.div
              key={g.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 * i }}
              className="glass-card-glow p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar name={g.name} photoUrl={g.photoUrl} size={58} ring="gold" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base md:text-lg text-foreground leading-tight line-clamp-2">{g.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {g.pillars.map((p) => {
                      const meta = pillarOf(p);
                      return (
                        <span key={p} className="chip text-[10px] px-2 py-0.5" style={{ background: `hsl(${meta.hue} / 0.15)`, color: `hsl(${meta.hue})` }}>
                          {meta.emoji} {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <p className="font-display text-3xl text-primary leading-none">{g.count}</p>
                  <p className="hud-label text-[9px]">🏅</p>
                </div>
              </div>
              <p className="text-sm md:text-base italic text-foreground/90 leading-relaxed">“{g.quote}”</p>
              <p className="text-xs text-muted-foreground mt-auto">
                — {g.author}
                {g.count > 1 && ` · y ${g.count - 1} más`}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default RecognitionsPhase;
~~~

### Archivo: `src/components/CelebrationExperience.tsx`

~~~tsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StarField from "@/components/StarField";
import IntroPhase from "./celebration/IntroPhase";
import RecognitionsPhase, { CelebrationRecognition, groupRecognitions, GROUPS_PER_SLIDE } from "./celebration/RecognitionsPhase";
import MilestonesPhase from "./celebration/MilestonesPhase";
import AwardsPhase from "./celebration/AwardsPhase";
import SurveyPhase from "./celebration/SurveyPhase";
import PulsePhase from "./celebration/PulsePhase";
import { usePeople, useWeekAwards, useWeekAwardVotes, useWeekCheckins, useWeekMilestones } from "@/hooks/useGame";
import { awardStandings, questionOf, SURVEY_QUESTIONS, surveyStandings, youtubeId } from "@/lib/gamification";
import BirthdaysPhase, { BirthdayPerson } from "./celebration/BirthdaysPhase";
import TopVotedPhase from "./celebration/TopVotedPhase";
import SuspensePhase from "./celebration/SuspensePhase";
import WinnerRevealPhase from "./celebration/WinnerRevealPhase";
import ClosingPhase from "./celebration/ClosingPhase";

type Phase = "intro" | "birthdays" | "pulse" | "milestones" | "survey" | "recognitions" | "awards" | "top" | "suspense" | "reveal" | "closing";

type Recognition = CelebrationRecognition;

interface VoteEntry {
  personId: string;
  name: string;
  photoUrl: string | null;
  count: number;
  reasons: string[];
}

interface CelebrationExperienceProps {
  weekLabel: string;
  weekId: string;
  recognitions: Recognition[];
  sortedVotes: VoteEntry[];
  onClose: () => void;
  /** Winner's media: a YouTube link plays as video on the reveal slide; any
   *  other URL (legacy uploaded MP3) plays as the reveal music. */
  winnerVideoUrl?: string | null;
}

const PHASES: Phase[] = ["intro", "birthdays", "pulse", "milestones", "survey", "recognitions", "awards", "top", "suspense", "reveal", "closing"];

/** Returns birthdays matching the 7-day window starting from weekStartDate (Mon). */
const filterBirthdaysForWeek = (
  people: { id: string; name: string; photo_url: string | null; song_url: string | null; birthday: string | null }[],
  weekStartDate: string
): BirthdayPerson[] => {
  const start = new Date(weekStartDate + "T00:00:00");
  const window: { m: number; d: number; offset: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    window.push({ m: d.getMonth() + 1, d: d.getDate(), offset: i });
  }

  return people
    .filter((p) => p.birthday)
    .map((p) => {
      const [, mm, dd] = p.birthday!.split("-").map(Number);
      const match = window.find((w) => w.m === mm && w.d === dd);
      return match ? { person: p, offset: match.offset } : null;
    })
    .filter((x): x is { person: typeof people[number]; offset: number } => x !== null)
    .sort((a, b) => a.offset - b.offset)
    .map(({ person }) => ({
      id: person.id,
      name: person.name,
      photo_url: person.photo_url,
      song_url: person.song_url,
      birthday: person.birthday!,
    }));
};

const CelebrationExperience = ({
  weekLabel,
  weekId,
  recognitions,
  sortedVotes,
  onClose,
  winnerVideoUrl,
}: CelebrationExperienceProps) => {
  const [phase, setPhase] = useState<Phase>("intro");
  const winnerHasVideo = !!youtubeId(winnerVideoUrl);
  const winnerAudioUrl = !winnerHasVideo && winnerVideoUrl ? winnerVideoUrl : null;
  // Survey answers are shown as one ranking per question; only written
  // comments and extra medals go to the condensed wall (one card per person).
  const commentRecs = useMemo(
    () => recognitions.filter((r) => !r.question_id || r.message !== questionOf(r.question_id)?.statement),
    [recognitions],
  );
  const recGroups = useMemo(() => groupRecognitions(commentRecs), [commentRecs]);
  const recSlides = Math.ceil(recGroups.length / GROUPS_PER_SLIDE);
  const [recIndex, setRecIndex] = useState(0);

  // Gamification data for this week
  const { data: people = [] } = usePeople();
  const { data: categories = [] } = useWeekAwards(weekId, { ensure: false });
  const { data: awardVotes = [] } = useWeekAwardVotes(weekId);
  const { data: milestones = [] } = useWeekMilestones(weekId);
  const { data: checkins = [] } = useWeekCheckins(weekId);
  const surveyResults = useMemo(
    () => SURVEY_QUESTIONS.map((q) => surveyStandings(q.id, recognitions as any, checkins)),
    [recognitions, checkins],
  );
  const surveyCount = recognitions.filter((r) => r.question_id).length;
  const [surveyIndex, setSurveyIndex] = useState(0);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const awardResults = useMemo(
    () => categories.map((c) => ({ category: c, standings: awardStandings(c.id, awardVotes) })),
    [categories, awardVotes],
  );
  const [awardIndex, setAwardIndex] = useState(-1);
  const [topRevealIndex, setTopRevealIndex] = useState(-1);
  const [birthdayIndex, setBirthdayIndex] = useState(-1); // -1 = teaser, 0..n = person
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const drumrollRef = useRef<HTMLAudioElement | null>(null);
  const revealRef = useRef<HTMLAudioElement | null>(null);
  const birthdaySongRef = useRef<HTMLAudioElement | null>(null);

  // Fetch week + birthdays
  const { data: birthdays = [] } = useQuery({
    queryKey: ["birthdays", weekId],
    queryFn: async () => {
      const { data: weekData } = await (supabase.from("weeks").select("start_date").eq("id", weekId).maybeSingle() as any);
      if (!weekData?.start_date) return [];
      const { data: peopleData } = await (supabase
        .from("people")
        .select("id, name, photo_url, song_url, birthday, active")
        .eq("active", true)
        .eq("approved", true) as any);
      if (!peopleData) return [];
      return filterBirthdaysForWeek(peopleData as any, weekData.start_date);
    },
  });

  // Create audio elements on mount
  useEffect(() => {
    const audio = new Audio("/audio/Award_Music_Winner.mp3");
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const drumroll = new Audio("/audio/Redoble_de_Tambores.mp3");
    drumroll.loop = true;
    drumroll.volume = volume * 1.3;
    drumrollRef.current = drumroll;

    const reveal = new Audio(winnerAudioUrl || "/audio/Winner_Reveal.mp3");
    reveal.loop = true;
    reveal.volume = volume;
    revealRef.current = reveal;

    return () => {
      audio.pause();
      drumroll.pause();
      reveal.pause();
      if (birthdaySongRef.current) birthdaySongRef.current.pause();
    };
  }, []);

  // Control music per phase — only restart when changing audio track
  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    const drumroll = drumrollRef.current;
    const reveal = revealRef.current;
    if (!audio || !drumroll || !reveal) return;

    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Determine which track each phase uses
    const trackFor = (p: Phase | null) => {
      if (p === "pulse" || p === "milestones" || p === "survey" || p === "recognitions" || p === "awards" || p === "top") return "audio";
      if (p === "suspense") return "drumroll";
      // The winner's YouTube video brings its own audio on the reveal slide
      if (p === "reveal") return winnerHasVideo ? null : "reveal";
      if (p === "closing") return "reveal";
      return null;
    };

    const prevTrack = trackFor(prev);
    const curTrack = trackFor(phase);

    // Adjust volume based on phase
    const phaseVolume = phase === "recognitions" ? volume * 0.10 : volume;
    audio.volume = phaseVolume;

    // If same track, don't restart
    if (prevTrack === curTrack && curTrack !== null) return;

    // Stop main tracks (birthday song handled separately)
    audio.pause();
    drumroll.pause();
    reveal.pause();

    if (curTrack === "audio") {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else if (curTrack === "drumroll") {
      drumroll.currentTime = 0;
      drumroll.play().catch(() => {});
    } else if (curTrack === "reveal") {
      reveal.currentTime = 0;
      reveal.play().catch(() => {});
    }
  }, [phase]);

  // Birthday song handling: play current person's song; pause on teaser/leave.
  useEffect(() => {
    // Always stop previous birthday song when index/phase changes
    if (birthdaySongRef.current) {
      birthdaySongRef.current.pause();
      birthdaySongRef.current = null;
    }

    if (phase !== "birthdays" || birthdayIndex < 0) return;

    // Birthday slide plays a YouTube video with its own audio — keep other audio silent.
    return;
    // eslint-disable-next-line no-unreachable
    const person = birthdays[birthdayIndex];
    if (!person?.song_url) return;

    const song = new Audio(person.song_url);
    song.loop = true;
    song.volume = volume;
    song.muted = muted;
    birthdaySongRef.current = song;
    song.play().catch(() => {});

    return () => {
      song.pause();
    };
  }, [phase, birthdayIndex, birthdays]);

  // Mute/unmute all
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (drumrollRef.current) drumrollRef.current.muted = muted;
    if (revealRef.current) revealRef.current.muted = muted;
    if (birthdaySongRef.current) birthdaySongRef.current.muted = muted;
  }, [muted]);

  // Sync volume
  useEffect(() => {
    const phaseVolume = phase === "recognitions" ? volume * 0.10 : volume;
    if (audioRef.current) audioRef.current.volume = phaseVolume;
    if (drumrollRef.current) drumrollRef.current.volume = Math.min(volume * 1.3, 1);
    if (revealRef.current) revealRef.current.volume = volume;
    if (birthdaySongRef.current) birthdaySongRef.current.volume = volume;
  }, [volume, phase]);

  const hasVotes = sortedVotes.length > 0;
  const maxCount = sortedVotes[0]?.count ?? 0;
  const winners = sortedVotes.filter((v) => v.count === maxCount);
  const topPositions = sortedVotes.filter((v) => v.count < maxCount).reverse();

  const isPhaseValid = useCallback(
    (p: Phase) => {
      if (p === "recognitions" && recGroups.length === 0) return false;
      if (p === "milestones" && milestones.length === 0) return false;
      if (p === "survey" && surveyCount === 0) return false;
      if (p === "pulse" && checkins.length === 0) return false;
      if (p === "awards" && (awardResults.length === 0 || awardVotes.length === 0)) return false;
      if (p === "birthdays" && birthdays.length === 0) return false;
      if (p === "top" && (!hasVotes || sortedVotes.length < 2)) return false;
      if (p === "suspense" && winners.length === 0) return false;
      if (p === "reveal" && winners.length === 0) return false;
      return true;
    },
    [recGroups.length, milestones.length, surveyCount, checkins.length, awardResults.length, awardVotes.length, birthdays.length, hasVotes, sortedVotes.length, winners.length]
  );

  const getNextPhase = useCallback(
    (current: Phase): Phase | null => {
      const idx = PHASES.indexOf(current);
      for (let i = idx + 1; i < PHASES.length; i++) {
        if (isPhaseValid(PHASES[i])) return PHASES[i];
      }
      return null;
    },
    [isPhaseValid]
  );

  const getPrevPhase = useCallback(
    (current: Phase): Phase | null => {
      const idx = PHASES.indexOf(current);
      for (let i = idx - 1; i >= 0; i--) {
        if (isPhaseValid(PHASES[i])) return PHASES[i];
      }
      return null;
    },
    [isPhaseValid]
  );

  const goNext = useCallback(() => {
    if (phase === "recognitions") {
      if (recIndex < recSlides - 1) {
        setRecIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "survey") {
      if (surveyIndex < SURVEY_QUESTIONS.length - 1) {
        setSurveyIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "awards") {
      if (awardIndex < awardResults.length - 1) {
        setAwardIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "birthdays") {
      if (birthdayIndex < birthdays.length - 1) {
        setBirthdayIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "top") {
      if (topRevealIndex < topPositions.length - 1) {
        setTopRevealIndex((i) => i + 1);
        return;
      }
    }
    const next = getNextPhase(phase);
    if (next) {
      if (next === "recognitions") setRecIndex(0);
      if (next === "awards") setAwardIndex(-1);
      if (next === "survey") setSurveyIndex(0);
      if (next === "birthdays") setBirthdayIndex(-1);
      if (next === "top") setTopRevealIndex(-1);
      setPhase(next);
    }
  }, [phase, recIndex, recSlides, surveyIndex, awardIndex, awardResults.length, birthdayIndex, birthdays.length, topRevealIndex, topPositions.length, getNextPhase]);

  const goPrev = useCallback(() => {
    if (phase === "recognitions") {
      if (recIndex > 0) {
        setRecIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "survey") {
      if (surveyIndex > 0) {
        setSurveyIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "awards") {
      if (awardIndex > -1) {
        setAwardIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "birthdays") {
      if (birthdayIndex > -1) {
        setBirthdayIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "top") {
      if (topRevealIndex >= 0) {
        setTopRevealIndex((i) => i - 1);
        return;
      }
    }
    const prev = getPrevPhase(phase);
    if (prev) {
      if (prev === "recognitions") setRecIndex(Math.max(0, recSlides - 1));
      if (prev === "awards") setAwardIndex(awardResults.length - 1);
      if (prev === "survey") setSurveyIndex(SURVEY_QUESTIONS.length - 1);
      if (prev === "birthdays") setBirthdayIndex(birthdays.length - 1);
      if (prev === "top") setTopRevealIndex(topPositions.length - 1);
      setPhase(prev);
    }
  }, [phase, recIndex, surveyIndex, awardIndex, awardResults.length, birthdayIndex, birthdays.length, topRevealIndex, getPrevPhase, recSlides, topPositions.length]);

  // Fullscreen
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Skip invalid phases on mount/change
  useEffect(() => {
    if (!isPhaseValid(phase) && phase !== "intro" && phase !== "closing") {
      const next = getNextPhase(phase);
      if (next) setPhase(next);
    }
  }, [phase, isPhaseValid, getNextPhase]);

  const handleClick = (e: React.MouseEvent) => {
    // During the birthday slide clicking only triggers confetti, never navigation.
    if (phase === "birthdays" && birthdayIndex >= 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverSide(x < rect.width / 2 ? "left" : "right");
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] overflow-hidden cursor-default"
      style={{ background: "hsl(var(--space-deep))" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverSide(null)}
    >
      <StarField />

      {/* Audio controls */}
      <div
        className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full transition-opacity duration-300 hover:opacity-100 opacity-60"
        style={{ background: "hsl(var(--space-deep) / 0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (v > 0 && muted) setMuted(false);
            if (v === 0) setMuted(true);
          }}
          className="w-20 h-1 accent-foreground cursor-pointer"
        />
        <button
          className="p-1 rounded-full"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? (
            <VolumeX className="h-5 w-5 text-foreground" />
          ) : (
            <Volume2 className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 transition-opacity duration-300 pointer-events-none"
        style={{ opacity: hoverSide === "left" ? 0.3 : 0 }}
      >
        <ChevronLeft className="h-12 w-12 text-foreground" />
      </div>
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 transition-opacity duration-300 pointer-events-none"
        style={{ opacity: hoverSide === "right" ? 0.3 : 0 }}
      >
        <ChevronRight className="h-12 w-12 text-foreground" />
      </div>

      <div className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <IntroPhase key="intro" weekLabel={weekLabel} />
          )}

          {phase === "pulse" && <PulsePhase key="pulse" checkins={checkins} />}

          {phase === "survey" && (
            <SurveyPhase key={`survey-${surveyIndex}`} index={surveyIndex} standings={surveyResults[surveyIndex]} peopleById={peopleById} />
          )}

          {phase === "milestones" && (
            <MilestonesPhase key="milestones" milestones={milestones} peopleById={peopleById} />
          )}

          {phase === "recognitions" && (
            <RecognitionsPhase
              key="recognitions"
              groups={recGroups}
              totalRecognitions={commentRecs.length}
              slide={recIndex}
            />
          )}

          {phase === "awards" && (
            <AwardsPhase key={`awards-${awardIndex}`} results={awardResults} index={awardIndex} peopleById={peopleById} />
          )}

          {phase === "birthdays" && birthdays.length > 0 && (
            <BirthdaysPhase
              key={`birthdays-${birthdayIndex}`}
              birthdays={birthdays}
              index={birthdayIndex}
              onFinish={goNext}
            />
          )}

          {phase === "top" && hasVotes && sortedVotes.length >= 2 && (
            <TopVotedPhase
              key="top"
              topVoted={sortedVotes.map((v) => ({
                personId: v.personId,
                name: v.name,
                photoUrl: v.photoUrl,
                count: v.count,
                reasons: v.reasons,
              }))}
              maxVotes={sortedVotes[0].count}
              revealedIndex={topRevealIndex}
              tiedCount={winners.length}
            />
          )}

          {phase === "suspense" && winners.length > 0 && (
            <SuspensePhase key="suspense" />
          )}

          {phase === "reveal" && winners.length > 0 && (
            <WinnerRevealPhase
              key="reveal"
              winners={winners.map((w) => ({
                name: w.name,
                photoUrl: w.photoUrl,
                voteCount: w.count,
              }))}
              videoUrl={winners.length === 1 && winnerHasVideo ? winnerVideoUrl : null}
            />
          )}

          {phase === "closing" && (
            <ClosingPhase
              key="closing"
              weekId={weekId}
              winners={winners.map((w) => ({
                name: w.name,
                reasons: w.reasons,
              }))}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CelebrationExperience;
~~~


### Cambios en `src/pages/Admin.tsx` (solo estos 3 reemplazos puntuales)

1. En la consulta de votos cambia `.select("*, people:voted_person_id(name, photo_url, song_url)")` por `.select("*, people:voted_person_id(name, photo_url, song_url, youtube_url)")`
2. Cambia `const songUrl = v.people?.song_url;` por `const songUrl = v.people?.youtube_url || v.people?.song_url;` (el video de YouTube tiene prioridad; si no hay, se usa la canción MP3 que la persona ya había subido)
3. En `<CelebrationExperience ... />` cambia la prop `winnerSongUrl={(() => {` por `winnerVideoUrl={(() => {` (el resto de esa función queda igual).

### Limpieza

Elimina el archivo `src/components/SongUploader.tsx` (ya no se usa; lo reemplazó `VictoryVideo.tsx`). NO borres el bucket "songs" ni la columna people.song_url: las canciones que ya subieron se siguen usando cuando el ganador no tiene video.

### Verificación final

Confirma que compila sin errores y revisa: que TODOS los enlaces del menú superior, de la barra inferior (celular) y los botones de la Nave abran su pantalla (/, /awards, /recognize, /vote, /milestones, /checkin, /my-recognitions, /admin); que el próximo cumpleaños salga arriba y en grande en la Nave; que la Nave muestre el "Clima del equipo" con caritas; inicio "Nave" con 5 sistemas; /awards; /recognize (encuesta); /vote; /milestones; /checkin; Admin → Premios y Admin → Autoevaluación; botón "🎬 Iniciar presentación" (solo admin) que abre la presentación con música de fondo (public/audio) y, si el ganador tiene video de YouTube, lo reproduce en la revelación. Dime si algo falló con el error exacto.
---

