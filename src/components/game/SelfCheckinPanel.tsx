import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import {
  BLOCKERS,
  GamePerson,
  Milestone,
  milestoneKind,
  SELF_WEIGHT,
  SelfCheckin,
  SpeedId,
  SPEEDS,
  SURVEY_QUESTIONS,
  XP,
} from "@/lib/gamification";
import GameButton from "./GameButton";

export type CheckinInput = Omit<SelfCheckin, "id" | "week_id" | "user_id" | "person_id">;

interface SelfCheckinPanelProps {
  milestones: Milestone[];
  peopleById: Record<string, GamePerson>;
  myPersonId?: string | null;
  initial?: SelfCheckin | null;
  locked?: boolean;
  onSave: (c: CheckinInput) => Promise<void>;
  onGoMilestones?: () => void;
}

/** Semicircle speed gauge; needle angle −60 (slow) … +60 (max). */
const Speedometer = ({ speed }: { speed: SpeedId | null }) => {
  const angle = speed ? SPEEDS[speed].needle : -90;
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[320px]" aria-hidden>
      <defs>
        <linearGradient id="gauge" x1="0" x2="1">
          <stop offset="0%" stopColor="hsl(352 90% 62%)" />
          <stop offset="50%" stopColor="hsl(188 100% 55%)" />
          <stop offset="100%" stopColor="hsl(44 100% 55%)" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="hsl(256 32% 14%)" strokeWidth="18" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#gauge)" strokeWidth="12" strokeLinecap="round" />
      {Array.from({ length: 13 }).map((_, i) => {
        const a = (-180 + i * 15) * (Math.PI / 180);
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 62}
            y1={100 + Math.sin(a) * 62}
            x2={100 + Math.cos(a) * (i % 3 === 0 ? 52 : 57)}
            y2={100 + Math.sin(a) * (i % 3 === 0 ? 52 : 57)}
            stroke="hsl(230 40% 96% / 0.5)"
            strokeWidth="2"
          />
        );
      })}
      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: "100px 100px",
          transition: "transform 0.9s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <line x1="100" y1="100" x2="100" y2="34" stroke="white" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="9" fill="hsl(var(--star-gold))" />
    </svg>
  );
};

const SelfCheckinPanel = ({ milestones, peopleById, myPersonId, initial, locked, onSave, onGoMilestones }: SelfCheckinPanelProps) => {
  const [speed, setSpeed] = useState<SpeedId | null>(initial?.speed ?? null);
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [blockers, setBlockers] = useState<string[]>(initial?.blockers ?? []);
  const [nextStep, setNextStep] = useState(initial?.next_step ?? "");
  const [milestoneIds, setMilestoneIds] = useState<string[]>(initial?.milestone_ids ?? []);
  const [ratings, setRatings] = useState<Record<string, number>>(initial?.ratings ?? {});
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!initial) return;
    setSpeed(initial.speed);
    setReason(initial.reason);
    setBlockers(initial.blockers);
    setNextStep(initial.next_step);
    setMilestoneIds(initial.milestone_ids);
    setRatings(initial.ratings || {});
  }, [initial]);

  const valid = !!speed && reason.trim().length >= 10;

  const save = async () => {
    if (!speed || !valid) return;
    setSaving(true);
    try {
      await onSave({ speed, reason: reason.trim(), blockers: speed === "bajo" ? blockers : [], next_step: nextStep.trim(), milestone_ids: milestoneIds, ratings });
      setBurst((b) => b + 1);
    } finally {
      setSaving(false);
    }
  };

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className={cn("space-y-5", locked && "pointer-events-none opacity-70")}>
      <EmojiBurst triggerSignal={burst} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Privado: solo tú y RH ven tu autoevaluación. En la presentación solo se muestran totales del equipo.
      </div>

      {/* Speed */}
      <div className="cockpit p-5 md:p-7">
        <p className="hud-label text-neon mb-3">1 · ¿A qué velocidad fuiste esta semana?</p>
        <div className="flex flex-col items-center">
          <Speedometer speed={speed} />
          <p className="font-display text-xl mt-1" style={{ color: speed ? `hsl(${SPEEDS[speed].hue})` : undefined }}>
            {speed ? `${SPEEDS[speed].emoji} ${SPEEDS[speed].label}` : "Elige tu velocidad"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {(Object.keys(SPEEDS) as SpeedId[]).map((id) => {
            const sp = SPEEDS[id];
            const on = speed === id;
            return (
              <motion.button
                key={id}
                whileTap={{ y: 3 }}
                onClick={() => setSpeed(id)}
                className={cn("btn-game rounded-2xl py-4 md:py-5 flex flex-col items-center gap-1", on ? "" : "btn-game-ghost")}
                style={
                  on
                    ? { background: `linear-gradient(180deg, hsl(${sp.hue} / 0.9), hsl(${sp.hue} / 0.55))`, boxShadow: `0 6px 0 hsl(${sp.hue} / 0.35), 0 0 30px hsl(${sp.hue} / 0.5)`, color: "hsl(var(--space-deep))" }
                    : undefined
                }
              >
                <span className="text-3xl md:text-4xl">{sp.emoji}</span>
                <span className="font-display text-[10px] md:text-xs font-bold uppercase tracking-wider text-center leading-tight px-1">{sp.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Reason */}
      {speed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="cockpit p-5 md:p-7 space-y-4">
          <p className="hud-label text-neon">2 · Cuéntanos por qué</p>
          <p className="font-display text-lg text-foreground">{SPEEDS[speed].prompt}</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sé honesto/a, esto nos ayuda a ayudarte." maxLength={500} className="min-h-[110px] bg-muted/40" />
          {speed === "bajo" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">¿Qué te frenó? (puedes elegir varias)</p>
              <div className="flex flex-wrap gap-2">
                {BLOCKERS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBlockers((l) => toggleIn(l, b))}
                    className={cn("chip border px-3 py-1.5", blockers.includes(b) ? "border-destructive bg-destructive/15 text-destructive" : "border-border text-muted-foreground")}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Input
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder={speed === "bajo" ? "¿Qué necesitas para la próxima semana?" : "¿Qué harás para mantener o subir el ritmo?"}
            maxLength={200}
            className="bg-muted/40"
          />
        </motion.div>
      )}

      {/* Milestones */}
      <div className="cockpit p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="hud-label text-neon">3 · ¿Qué hitos respaldan tu semana?</p>
          {onGoMilestones && (
            <button onClick={onGoMilestones} className="text-xs text-accent hover:underline">
              + Registrar un hito
            </button>
          )}
        </div>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay hitos registrados esta semana.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {milestones.map((m) => {
              const on = milestoneIds.includes(m.id);
              const mine = !!myPersonId && m.participants.includes(myPersonId);
              return (
                <button
                  key={m.id}
                  onClick={() => setMilestoneIds((l) => toggleIn(l, m.id))}
                  className={cn("text-left rounded-xl border p-3 flex gap-3 transition-all", on ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20")}
                >
                  <span className="text-2xl">{on ? "✅" : milestoneKind(m.kind).emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {"🚀".repeat(m.impact)} · {m.participants.map((id) => peopleById[id]?.name.split(" ")[0]).filter(Boolean).join(", ")}
                    </p>
                    {mine && <span className="chip bg-accent/15 text-accent text-[10px] px-2 py-0 mt-1">Participaste</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Self ratings */}
      <div className="cockpit p-5 md:p-7">
        <p className="hud-label text-neon mb-1">4 · Califícate en las 5 preguntas</p>
        <p className="text-xs text-muted-foreground mb-4">
          Tu autoevaluación vale <strong className="text-primary">½</strong> frente a un voto externo ({SELF_WEIGHT} × 🚀). Déjala vacía si no aplica.
        </p>
        <div className="space-y-2">
          {SURVEY_QUESTIONS.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/20 border border-border/50 px-3 py-2">
              <span className="text-sm">
                {q.emoji} {q.self}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRatings((r) => ({ ...r, [q.id]: r[q.id] === n ? 0 : n }))}
                    className={cn("h-9 w-9 rounded-lg border", n <= (ratings[q.id] || 0) ? "border-primary/70 bg-primary/20" : "border-border bg-muted/40 grayscale opacity-50")}
                    aria-label={`${n} cohetes`}
                  >
                    🚀
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-20 lg:bottom-4 z-30">
        <GameButton variant="gold" size="xl" className="w-full" disabled={!valid || saving || locked} onClick={save}>
          {saving ? "Guardando…" : initial ? "💾 Actualizar autoevaluación" : `🪞 Guardar autoevaluación · +${XP.selfCheckin} XP`}
        </GameButton>
      </div>
    </div>
  );
};

export default SelfCheckinPanel;
