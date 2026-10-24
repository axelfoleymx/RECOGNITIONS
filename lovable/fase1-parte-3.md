# FASE 1 · PARTE 3 DE 4 — Rocketing Recognitions

Crea o reemplaza cada archivo EXACTAMENTE con el contenido indicado (completo, sin resumir ni rediseñar). No toques otros archivos ni el login, y no borres datos.

### Archivo: `src/components/game/RocketerArena.tsx`

~~~tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, RotateCcw, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { GamePerson, XP } from "@/lib/gamification";
import Trophy from "./Trophy";
import PlayerAvatar from "./PlayerAvatar";
import { PeopleTray } from "./DragPeople";

interface RocketerArenaProps {
  people: GamePerson[];
  myUserId: string | null;
  /** recent winners that can't receive Rocketer votes */
  cooldownIds: Set<string>;
  existing?: { personId: string; reason: string } | null;
  locked?: boolean;
  onVote: (personId: string, reason: string) => Promise<void>;
  onAnnul: () => Promise<void>;
}

const ZONE = "rocketer";

const RocketerArena = ({ people, myUserId, cooldownIds, existing, locked, onVote, onAnnul }: RocketerArenaProps) => {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const shown = existing ? byId[existing.personId] : personId ? byId[personId] : null;

  const drop = (pid: string, zone: string) => {
    if (zone !== ZONE || existing || locked) return;
    const p = byId[pid];
    if (p && myUserId && p.user_id === myUserId) return flash("No puedes votarte a ti mismo/a 😉");
    if (cooldownIds.has(pid)) return flash("❄️ Ganó el Rocketer la semana pasada; esta semana descansa. Puedes darle una medalla en Recognitions.");
    setPersonId(pid);
  };

  const flash = (msg: string) => {
    setWarning(msg);
    setTimeout(() => setWarning(null), 2800);
  };

  const valid = reason.trim().length >= 10;

  return (
    <div className="space-y-6">
      <EmojiBurst triggerSignal={burst} count={30} />

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-stretch">
        <div
          data-dropzone={ZONE}
          onClick={() => {
            if (selected) {
              drop(selected, ZONE);
              setSelected(null);
            }
          }}
          className={cn(
            "relative overflow-hidden rounded-3xl border p-6 min-h-[380px] flex flex-col items-center justify-center",
            "bg-[radial-gradient(circle_at_50%_40%,hsl(var(--neon-violet)/0.35),transparent_65%)] bg-card/70",
            hover === ZONE || selected
              ? "border-neon-violet shadow-[0_0_0_2px_hsl(var(--neon-violet)/0.7),0_0_70px_hsl(var(--neon-violet)/0.45)]"
              : "border-neon-violet/40",
          )}
        >
          <span className="hud-label text-neon-violet">Mega trofeo</span>
          <div className="relative mt-2">
            <Trophy size={190} emoji={shown ? undefined : "🚀"} variant="mega" active={hover === ZONE || !!shown} />
            <AnimatePresence>
              {shown && (
                <motion.div
                  key={shown.id}
                  initial={{ scale: 0, y: -90 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 14 }}
                  className="absolute left-1/2 -translate-x-1/2 top-6"
                >
                  <PlayerAvatar name={shown.name} photoUrl={shown.photo_url} size={104} ring="gold" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <h2 className="font-display text-xl md:text-2xl font-black text-gold-gradient mt-3 text-center">
            {shown ? shown.name : "Rocketer de la Semana"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mt-1 max-w-sm">
            El MVP de la semana: quien más impulsó al equipo y al cliente. Quien ganó la semana pasada descansa ❄️ esta semana.
          </p>
          {personId && !existing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPersonId(null);
              }}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="glass-card p-5 md:p-6 flex flex-col justify-center gap-4">
          {existing ? (
            <div className="text-center space-y-3">
              <Lock className="h-10 w-10 text-accent mx-auto" />
              <h3 className="font-display text-lg">Voto registrado</h3>
              {existing.reason && (
                <p className="text-sm italic text-foreground/90 glass-card p-3 text-left">“{existing.reason}”</p>
              )}
              {!locked && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm("¿Anular tu voto para votar de nuevo?")) return;
                    setBusy(true);
                    try {
                      await onAnnul();
                      setPersonId(null);
                      setReason("");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Anular y votar de nuevo
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="hud-label">¿Por qué es el Rocketer? *</p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={personId ? "Cuenta el impacto concreto: qué logró, para qué cliente, qué resultado…" : "Primero arrastra a alguien al mega trofeo"}
                disabled={!personId}
                maxLength={500}
                className="min-h-[140px] bg-muted/40"
              />
              <p className={cn("text-xs font-hud", valid ? "text-muted-foreground" : "text-destructive/80")}>
                {reason.trim().length}/10 caracteres mínimos
              </p>
              <Button
                disabled={!personId || !valid || busy || locked}
                className="btn-space h-12 font-display tracking-wider"
                onClick={async () => {
                  if (!personId) return;
                  setBusy(true);
                  try {
                    await onVote(personId, reason.trim());
                    setBurst((b) => b + 1);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Enviando..." : `⭐ Confirmar voto · +${XP.castRocketerVote} XP`}
              </Button>
            </>
          )}
        </div>
      </div>

      {!existing && !locked && (
        <PeopleTray
          people={people}
          selectedId={selected}
          onSelect={setSelected}
          onHover={setHover}
          onDrop={drop}
          stateFor={(p) => {
            if (myUserId && p.user_id === myUserId) return { disabled: true, badge: "Tú" };
            if (cooldownIds.has(p.id)) return { disabled: true, badge: "❄️", hint: "Ganó la semana pasada (descansa esta semana)" };
            return undefined;
          }}
        />
      )}

      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[70] chip bg-destructive text-destructive-foreground px-4 py-2 text-sm"
          >
            {warning}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RocketerArena;
~~~

### Archivo: `src/components/game/SelfCheckinPanel.tsx`

~~~tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import {
  BLOCKERS,
  GamePerson,
  Milestone,
  milestoneKind,
  MOODS,
  SELF_WEIGHT,
  SelfCheckin,
  SpeedId,
  SPEEDS,
  SurveyQuestion,
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
  /** the week's awards, so people rate themselves on the same things (worth ½) */
  questions: SurveyQuestion[];
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

const SelfCheckinPanel = ({ milestones, peopleById, myPersonId, initial, locked, onSave, onGoMilestones, questions }: SelfCheckinPanelProps) => {
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [wantsSupport, setWantsSupport] = useState<boolean>(initial?.wants_support ?? false);
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
    setMood(initial.mood ?? null);
    setWantsSupport(initial.wants_support ?? false);
    setSpeed(initial.speed);
    setReason(initial.reason);
    setBlockers(initial.blockers);
    setNextStep(initial.next_step);
    setMilestoneIds(initial.milestone_ids);
    setRatings(initial.ratings || {});
  }, [initial]);

  const valid = !!mood && !!speed && reason.trim().length >= 10;

  const save = async () => {
    if (!speed || !valid) return;
    setSaving(true);
    try {
      await onSave({ mood, wants_support: wantsSupport, speed, reason: reason.trim(), blockers: speed === "bajo" ? blockers : [], next_step: nextStep.trim(), milestone_ids: milestoneIds, ratings });
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

      {/* Mood — the team-climate KPI */}
      <div className="cockpit p-5 md:p-7">
        <p className="hud-label text-neon mb-1">1 · ¿Cómo te sentiste esta semana?</p>
        <p className="text-xs text-muted-foreground mb-4">Es el termómetro del clima del equipo. Se publica solo el total, nunca tu nombre.</p>
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {MOODS.map((m) => {
            const on = mood === m.value;
            return (
              <motion.button
                key={m.value}
                type="button"
                whileTap={{ scale: 0.92 }}
                animate={on ? { y: -6, scale: 1.06 } : { y: 0, scale: 1 }}
                onClick={() => setMood(m.value)}
                aria-pressed={on}
                aria-label={m.label}
                className={cn(
                  "rounded-2xl border py-3 md:py-5 flex flex-col items-center gap-1 transition-colors",
                  on ? "" : "border-border/60 bg-muted/30 hover:bg-muted/60",
                  mood && !on && "opacity-50",
                )}
                style={on ? { borderColor: `hsl(${m.hue})`, background: `hsl(${m.hue} / 0.15)`, boxShadow: `0 0 26px hsl(${m.hue} / 0.45)` } : undefined}
              >
                <span className="text-3xl md:text-5xl leading-none">{m.emoji}</span>
                <span className="font-display text-[9px] md:text-xs font-bold uppercase tracking-wider" style={on ? { color: `hsl(${m.hue})` } : undefined}>
                  {m.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        {mood !== null && mood <= 2 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-foreground/90 mt-4">
            Gracias por decirlo. Una semana pesada le pasa a cualquiera; el equipo está para echarte la mano. 🫂
          </motion.p>
        )}
        <div className="flex items-center gap-2 mt-4">
          <Checkbox id="support" checked={wantsSupport} onCheckedChange={(v) => setWantsSupport(v === true)} />
          <Label htmlFor="support" className="text-sm text-muted-foreground">
            Me gustaría que alguien del equipo me eche la mano esta semana (solo lo ve RH)
          </Label>
        </div>
      </div>

      {/* Speed */}
      <div className="cockpit p-5 md:p-7">
        <p className="hud-label text-neon mb-3">2 · ¿A qué velocidad fuiste?</p>
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
          <p className="hud-label text-neon">3 · Cuéntanos por qué</p>
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
          <p className="hud-label text-neon">4 · ¿Qué hitos respaldan tu semana?</p>
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
        <p className="hud-label text-neon mb-1">5 · ¿Te ganaste algún premio de la semana?</p>
        <p className="text-xs text-muted-foreground mb-4">
          Tu autoevaluación vale <strong className="text-primary">½</strong> frente a un voto externo ({SELF_WEIGHT} × 🚀). Déjala vacía si no aplica.
        </p>
        <div className="space-y-2">
          {questions.map((q) => (
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
~~~

### Archivo: `src/components/celebration/AwardsPhase.tsx`

~~~tsx
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
~~~

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

// Anonymous messages get a playful alias instead of a plain "Anónimo"
const ANON_ALIASES = [
  "👽 Un astronauta misterioso",
  "🛸 Alguien desde otra galaxia",
  "🌙 Un admirador secreto",
  "☄️ Un cometa anónimo",
  "🕶️ Agente encubierto",
  "🪐 Alguien en órbita",
];
const anonAlias = (id: string) => ANON_ALIASES[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % ANON_ALIASES.length];

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
        author: best.is_anonymous ? anonAlias(best.id) : best.profiles?.full_name || anonAlias(best.id),
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
import { ChevronLeft, ChevronRight, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StarField from "@/components/StarField";
import IntroPhase from "./celebration/IntroPhase";
import RecognitionsPhase, { CelebrationRecognition, groupRecognitions, GROUPS_PER_SLIDE } from "./celebration/RecognitionsPhase";
import MilestonesPhase from "./celebration/MilestonesPhase";
import AwardsPhase from "./celebration/AwardsPhase";
import PulsePhase from "./celebration/PulsePhase";
import { usePeople, useWeekAwards, useWeekAwardVotes, useWeekCheckins, useWeekMilestones } from "@/hooks/useGame";
import { categoryStandings, isAutoStatement, youtubeId } from "@/lib/gamification";
import BirthdaysPhase, { BirthdayPerson } from "./celebration/BirthdaysPhase";
import TopVotedPhase from "./celebration/TopVotedPhase";
import SuspensePhase from "./celebration/SuspensePhase";
import WinnerRevealPhase from "./celebration/WinnerRevealPhase";
import ClosingPhase from "./celebration/ClosingPhase";

type Phase = "intro" | "birthdays" | "pulse" | "milestones" | "awards" | "recognitions" | "top" | "suspense" | "reveal" | "closing";

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

// One slide per award (its winner comes from the survey), then the free medals wall, then Rocketer
const PHASES: Phase[] = ["intro", "birthdays", "pulse", "milestones", "awards", "recognitions", "top", "suspense", "reveal", "closing"];

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
  // Award answers become the award slides; only written comments and free
  // medals go to the condensed wall (one card per person).
  const commentRecs = useMemo(
    () => recognitions.filter((r) => !r.question_id || !isAutoStatement(r.message)),
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
  // Late recognitions must show up: refresh everything on open and every 15 s while presenting
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () =>
      ["recognitions", "votes", "award-votes", "milestones", "checkins", "week-awards"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [queryClient]);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const awardResults = useMemo(
    () =>
      categories.map((c) => ({
        category: c,
        standings: categoryStandings(c.id, recognitions as any, awardVotes, checkins),
      })),
    [categories, recognitions, awardVotes, checkins],
  );
  const [awardIndex, setAwardIndex] = useState(-1);
  const [topRevealIndex, setTopRevealIndex] = useState(-1);
  const [birthdayIndex, setBirthdayIndex] = useState(-1); // -1 = teaser, 0..n = person
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.08); // soft by default; some people prefer no music
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
      if (p === "pulse" || p === "milestones" || p === "recognitions" || p === "awards" || p === "top") return "audio";
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
      if (p === "pulse" && checkins.length === 0) return false;
      if (p === "awards" && !awardResults.some((r) => r.standings.length > 0)) return false;
      if (p === "birthdays" && birthdays.length === 0) return false;
      if (p === "top" && (!hasVotes || sortedVotes.length < 2)) return false;
      if (p === "suspense" && winners.length === 0) return false;
      if (p === "reveal" && winners.length === 0) return false;
      return true;
    },
    [recGroups.length, milestones.length, checkins.length, awardResults, birthdays.length, hasVotes, sortedVotes.length, winners.length]
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
      if (next === "birthdays") setBirthdayIndex(-1);
      if (next === "top") setTopRevealIndex(-1);
      setPhase(next);
    }
  }, [phase, recIndex, recSlides, awardIndex, awardResults.length, birthdayIndex, birthdays.length, topRevealIndex, topPositions.length, getNextPhase]);

  const goPrev = useCallback(() => {
    if (phase === "recognitions") {
      if (recIndex > 0) {
        setRecIndex((i) => i - 1);
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
      if (prev === "birthdays") setBirthdayIndex(birthdays.length - 1);
      if (prev === "top") setTopRevealIndex(topPositions.length - 1);
      setPhase(prev);
    }
  }, [phase, recIndex, awardIndex, awardResults.length, birthdayIndex, birthdays.length, topRevealIndex, getPrevPhase, recSlides, topPositions.length]);

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
        className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full transition-opacity duration-300 hover:opacity-100 opacity-90"
        style={{ background: "hsl(var(--space-deep) / 0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-hud text-foreground/80 pl-1">Música</span>
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

      {/* Skip the current section (admin running the meeting) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const next = getNextPhase(phase);
          if (!next) return;
          if (next === "recognitions") setRecIndex(0);
          if (next === "awards") setAwardIndex(-1);
          if (next === "birthdays") setBirthdayIndex(-1);
          if (next === "top") setTopRevealIndex(-1);
          setPhase(next);
        }}
        className="absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm opacity-70 hover:opacity-100 transition-opacity"
        style={{ background: "hsl(var(--space-deep) / 0.7)", color: "hsl(var(--foreground))" }}
        aria-label="Saltar a la siguiente sección"
      >
        <SkipForward className="h-4 w-4" /> Saltar sección
      </button>

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

### Archivo: `src/components/VoteReminderBanner.tsx`

~~~tsx
import { AlertTriangle, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePendingVote } from "@/hooks/usePendingVote";

interface Props {
  /** sticky bar (default) or inline card inside a form/page */
  variant?: "sticky" | "inline";
  className?: string;
}

const VoteReminderBanner = ({ variant = "sticky", className = "" }: Props) => {
  const { pending } = usePendingVote();
  const navigate = useNavigate();
  const location = useLocation();

  // On the voting page itself the reminder is redundant
  if (location.pathname === "/vote") return null;

  const content = (
    <div className="flex items-center gap-3 w-full">
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="shrink-0"
      >
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </motion.span>
      <p className="text-sm text-destructive font-medium text-left flex-1">
        {/* compact on phones so it doesn't push the page content down */}
        <span className="sm:hidden">Te falta votar al <strong>Rocketer</strong></span>
        <span className="hidden sm:inline">
          Aún no votas por tu <strong>Rocketer de la semana</strong> — tu voto cuenta y define al ganador 🚀
        </span>
      </p>
      <Button
        size="sm"
        onClick={() => navigate("/vote")}
        className="btn-space shrink-0 gap-1"
      >
        <Star className="h-4 w-4" /> <span className="hidden sm:inline">Votar ahora</span><span className="sm:hidden">Votar</span>
      </Button>
    </div>
  );

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={
            variant === "sticky"
              ? `sticky top-0 z-40 w-full border-b border-destructive/40 bg-destructive/15 backdrop-blur-xl ${className}`
              : `glass-card border-destructive/50 bg-destructive/10 p-4 ${className}`
          }
        >
          <div
            className={
              variant === "sticky"
                ? "mx-auto max-w-5xl px-4 py-1.5 sm:py-2.5"
                : ""
            }
          >
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoteReminderBanner;
~~~

