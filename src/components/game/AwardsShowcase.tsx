import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { AwardCategory, pillarOf, RECOGNITION_PILLARS } from "@/lib/gamification";
import Trophy from "./Trophy";
import GameButton from "./GameButton";

export type ProposeInput = { name: string; description: string; emoji: string; pillar: string };

const CUSTOM_EMOJIS = ["🏅", "🦸", "🧠", "🎯", "🔥", "💎", "🧲", "🛠️", "🎤", "📣", "🧪", "🐐"];

interface AwardsShowcaseProps {
  categories: AwardCategory[];
  /** how many times each award was voted this week (no leader shown: results are revealed on Friday) */
  mentions: Record<string, number>;
  surveyDone: boolean;
  locked?: boolean;
  canPropose?: boolean;
  onPropose?: (a: ProposeInput) => Promise<void>;
  onVote: () => void;
}

/** The week's awards. Voting happens inside the Recognitions survey: one question per award. */
const AwardsShowcase = ({ categories, mentions, surveyDone, locked, canPropose, onPropose, onVote }: AwardsShowcaseProps) => {
  const [proposing, setProposing] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pEmoji, setPEmoji] = useState(CUSTOM_EMOJIS[0]);
  const [pPillar, setPPillar] = useState<string>("actitud");
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  return (
    <div className="space-y-5">
      <EmojiBurst triggerSignal={burst} />

      <div className="cockpit p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="hud-label text-neon">Cómo se ganan</p>
          <p className="text-sm text-foreground/90 mt-1">
            Cada premio es una pregunta de la encuesta de Recognitions. Quien junte más 🚀 en esa pregunta se lo lleva, y se revela el viernes en la
            presentación.
          </p>
        </div>
        <GameButton variant={surveyDone ? "ghost" : "gold"} size="lg" onClick={onVote} disabled={locked}>
          {surveyDone ? "✓ Ya votaste · dar medallas" : "🏅 Votar los premios"}
        </GameButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {categories.map((c, i) => {
          const pillar = pillarOf(c.pillar);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-3 md:p-4 flex flex-col items-center text-center"
            >
              <span
                className="chip mb-1"
                style={
                  c.is_custom
                    ? { background: "hsl(var(--neon-magenta) / 0.18)", color: "hsl(var(--neon-magenta))" }
                    : { background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }
                }
              >
                {c.is_custom ? "⭐ Premio de la tripulación" : `${pillar.emoji} ${pillar.label}`}
              </span>
              <Trophy size={78} emoji={c.emoji} />
              <h3 className="font-display text-[12px] md:text-sm font-bold text-gold-gradient mt-2 leading-tight">{c.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.description}</p>
              <p className="font-hud text-[11px] text-muted-foreground mt-auto pt-2">{mentions[c.id] || 0} votos</p>
            </motion.div>
          );
        })}
        {canPropose && !locked && onPropose && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={() => setProposing(true)}
            className="rounded-2xl border-2 border-dashed border-neon-magenta/60 bg-neon-magenta/5 p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[220px] hover:bg-neon-magenta/10 transition-all"
          >
            <span className="text-5xl">➕</span>
            <span className="font-display text-sm font-bold text-neon-magenta">Proponer premio extra</span>
            <span className="text-[11px] text-muted-foreground">Solo 1 por semana para todo el equipo. ¡El primero que lo cree lo nombra!</span>
          </motion.button>
        )}
      </div>

      <Dialog open={proposing} onOpenChange={setProposing}>
        <DialogContent className="bg-card border-neon-magenta/50 max-w-md">
          <DialogHeader className="items-center text-center">
            <Trophy size={90} emoji={pEmoji} active />
            <DialogTitle className="font-display text-gold-gradient text-lg">{pName || "Nuevo premio"}</DialogTitle>
            <DialogDescription>Crea el premio extra de esta semana. Se agrega como pregunta a la encuesta de todos.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-1.5">
            {CUSTOM_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setPEmoji(e)}
                aria-label={`Emoji ${e}`}
                className={cn("h-10 w-10 rounded-lg text-xl border", pEmoji === e ? "border-primary bg-primary/15" : "border-border bg-muted/30")}
              >
                {e}
              </button>
            ))}
          </div>
          <Input id="award-name" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nombre (ej. El/La Salvavidas del Viernes)" maxLength={40} className="bg-muted/40" />
          <Textarea id="award-description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="¿Qué conducta premia?" maxLength={160} className="bg-muted/40 min-h-[70px]" />
          <div className="flex flex-wrap gap-1.5">
            {RECOGNITION_PILLARS.map((id) => (
              <button
                key={id}
                onClick={() => setPPillar(id)}
                className={cn("chip border px-2.5 py-1", pPillar === id ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}
              >
                {pillarOf(id).emoji} {pillarOf(id).label}
              </button>
            ))}
          </div>
          <GameButton
            variant="violet"
            size="lg"
            className="w-full"
            disabled={pName.trim().length < 3 || saving}
            onClick={async () => {
              if (!onPropose) return;
              setSaving(true);
              try {
                await onPropose({ name: pName.trim(), description: pDesc.trim(), emoji: pEmoji, pillar: pPillar });
                setProposing(false);
                setBurst((b) => b + 1);
              } finally {
                setSaving(false);
              }
            }}
          >
            ➕ Crear premio extra
          </GameButton>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AwardsShowcase;
