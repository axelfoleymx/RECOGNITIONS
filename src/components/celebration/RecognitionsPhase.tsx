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
