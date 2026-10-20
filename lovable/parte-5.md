# PARTE 5 DE 6 — Rocketing Recognitions 2.0

Ejecuta los pasos de este documento en orden. Copia cada archivo EXACTAMENTE (contenido completo).

Paso 10 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Hitos y Autoevaluación

### Archivo: `src/components/game/MilestonesBoard.tsx`

~~~tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { firstName, GamePerson, Milestone, MILESTONE_KINDS, milestoneKind, XP } from "@/lib/gamification";
import PlayerAvatar from "./PlayerAvatar";
import RocketPicker from "./RocketPicker";

export type MilestoneInput = { title: string; description: string; kind: string; impact: number; participants: string[] };

interface MilestonesBoardProps {
  people: GamePerson[];
  milestones: Milestone[];
  myUserId: string | null;
  isAdmin?: boolean;
  onCreate: (m: MilestoneInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const MilestoneCard = ({
  m,
  peopleById,
  onDelete,
}: {
  m: Milestone;
  peopleById: Record<string, GamePerson>;
  onDelete?: () => void;
}) => {
  const kind = milestoneKind(m.kind);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 flex gap-4"
    >
      <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-neon-violet/40 to-neon-magenta/30 flex items-center justify-center text-2xl">
        {kind.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="hud-label">{kind.label}</p>
            <h3 className="font-semibold text-foreground leading-snug">{m.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm" title="Impacto">{"🚀".repeat(m.impact)}</span>
            {onDelete && (
              <button onClick={onDelete} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive" aria-label="Eliminar hito">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {m.participants.map((pid) => {
            const p = peopleById[pid];
            if (!p) return null;
            return (
              <span key={pid} className="flex items-center gap-1.5 rounded-full bg-muted/50 pl-0.5 pr-2.5 py-0.5">
                <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={22} ring="none" />
                <span className="text-xs">{firstName(p.name)}</span>
              </span>
            );
          })}
          <span className="chip bg-xp/10 text-xp ml-auto">+{XP.joinMilestone} XP c/u</span>
        </div>
      </div>
    </motion.div>
  );
};

const MilestonesBoard = ({ people, milestones, myUserId, isAdmin, onCreate, onDelete }: MilestonesBoardProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("entrega");
  const [impact, setImpact] = useState(1);
  const [participants, setParticipants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
  const toggle = (id: string) =>
    setParticipants((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const valid = title.trim().length >= 4 && participants.length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), description: description.trim(), kind, impact, participants });
      setTitle("");
      setDescription("");
      setImpact(1);
      setParticipants([]);
      setBurst((b) => b + 1);
    } finally {
      setSaving(false);
    }
  };

  const totalPeople = new Set(milestones.flatMap((m) => m.participants)).size;

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
      <EmojiBurst triggerSignal={burst} />

      <div className="glass-card p-5 md:p-6 space-y-5 lg:sticky lg:top-20">
        <div>
          <p className="hud-label mb-2">Tipo de hito</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MILESTONE_KINDS).map(([id, k]) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={cn(
                  "chip border px-3 py-1.5 transition-all",
                  kind === id ? "border-primary bg-primary/15 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="hud-label">¿Qué se logró?</p>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Lanzamos la campaña de Black Friday de Cliente X" maxLength={120} className="bg-muted/40" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Resultado o dato duro (opcional): +35% CTR, entrega 2 días antes…" maxLength={300} className="bg-muted/40 min-h-[80px]" />
        </div>

        <div>
          <p className="hud-label mb-2">Impacto</p>
          <RocketPicker value={impact} onChange={setImpact} />
        </div>

        <div>
          <p className="hud-label mb-2">¿Quiénes participaron? ({participants.length})</p>
          <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
            {people.map((p) => {
              const on = participants.includes(p.id);
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full pl-0.5 pr-3 py-0.5 border transition-all",
                    on ? "border-primary bg-primary/15" : "border-border/60 bg-muted/30 opacity-70 hover:opacity-100",
                  )}
                >
                  <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={26} ring={on ? "gold" : "none"} />
                  <span className="text-xs">{firstName(p.name)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <Button onClick={submit} disabled={!valid || saving} className="w-full btn-space h-12 font-display tracking-wider">
          {saving ? "Registrando..." : `🏁 Registrar hito · +${XP.createMilestone} XP`}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <p className="hud-label">Hitos esta semana</p>
            <p className="font-display text-3xl text-primary">{milestones.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="hud-label">Personas involucradas</p>
            <p className="font-display text-3xl text-accent">{totalPeople}</p>
          </div>
        </div>
        <AnimatePresence>
          {milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              m={m}
              peopleById={peopleById}
              onDelete={m.created_by === myUserId || isAdmin ? () => onDelete(m.id) : undefined}
            />
          ))}
        </AnimatePresence>
        {milestones.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            Aún no hay hitos esta semana. ¡Registra el primero y suma a tu equipo! 🏁
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestonesBoard;
~~~

### Archivo: `src/pages/Milestones.tsx`

~~~tsx
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useWeekMilestones } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import MilestonesBoard, { MilestoneInput } from "@/components/game/MilestonesBoard";

const Milestones = () => {
  const { user, isAdmin } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: milestones = [] } = useWeekMilestones(week?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
  };

  const onCreate = async ({ participants, ...m }: MilestoneInput) => {
    if (!week || !user) return;
    const { data, error } = await supabase
      .from("milestones")
      .insert({ ...m, week_id: week.id, created_by: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: "No se pudo registrar", description: error.message, variant: "destructive" });
      throw error;
    }
    const { error: pErr } = await supabase
      .from("milestone_participants")
      .insert(participants.map((person_id) => ({ milestone_id: data.id, person_id })));
    if (pErr) toast({ title: "Error al agregar participantes", description: pErr.message, variant: "destructive" });
    toast({ title: "¡Hito registrado! 🏁" });
    refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar este hito?")) return;
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    refresh();
  };

  return (
    <GameShell>
      <div className="mb-6">
        <p className="hud-label text-neon">Bitácora de misión</p>
        <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">Hitos de la Semana</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Logros reales y medibles: entregas, clientes, resultados. Cada participante gana XP y el hito aparece en la presentación.
        </p>
      </div>
      <MilestonesBoard
        people={people.filter((p) => p.approved !== false)}
        milestones={milestones}
        myUserId={user?.id ?? null}
        isAdmin={isAdmin}
        onCreate={onCreate}
        onDelete={onDelete}
      />
    </GameShell>
  );
};

export default Milestones;
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
        <p className="hud-label text-neon mb-1">5 · Califícate en las 5 preguntas</p>
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
~~~

### Archivo: `src/pages/Checkin.tsx`

~~~tsx
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useMyCheckin, useMyPerson, usePeople, useWeekMilestones } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import SelfCheckinPanel, { CheckinInput } from "@/components/game/SelfCheckinPanel";

const Checkin = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: me } = useMyPerson();
  const { data: milestones = [] } = useWeekMilestones(week?.id);
  const { data: mine } = useMyCheckin(week?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSave = async (c: CheckinInput) => {
    if (!week || !user) return;
    const { error } = await supabase
      .from("self_checkins")
      .upsert({ ...c, week_id: week.id, user_id: user.id }, { onConflict: "week_id,user_id" });
    if (error) {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Autoevaluación guardada 🪞", description: "Sistema de Autoevaluación en verde 🟢" });
    queryClient.invalidateQueries({ queryKey: ["checkin"] });
    queryClient.invalidateQueries({ queryKey: ["checkin-pulse"] });
    queryClient.invalidateQueries({ queryKey: ["mood-pulse"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
  };

  return (
    <GameShell>
      <div className="mb-6">
        <p className="hud-label text-neon">Sistema 5 · Autoevaluación</p>
        <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">¿Cómo voló tu semana?</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Reconocer cuándo fuiste bajo tu velocidad también es de Rocketers. Sé honesto/a: esto no resta puntos, nos ayuda a quitarte bloqueos.
        </p>
      </div>
      <SelfCheckinPanel
        milestones={milestones}
        peopleById={Object.fromEntries(people.map((p) => [p.id, p]))}
        myPersonId={me?.id}
        initial={mine}
        locked={week?.status !== "open"}
        onSave={onSave}
        onGoMilestones={() => navigate("/milestones")}
      />
    </GameShell>
  );
};

export default Checkin;
~~~

---

Paso 11 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Rutas y Admin

`src/App.tsx` reemplaza al actual (agrega las rutas /awards, /milestones y /checkin; el resto de rutas y el login quedan igual).

### Archivo: `src/App.tsx`

~~~tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Index from "./pages/Index";
import MiDiploma from "./pages/MiDiploma";
import MyRecognitions from "./pages/MyRecognitions";
import Recognize from "./pages/Recognize";
import Vote from "./pages/Vote";
import Awards from "./pages/Awards";
import Milestones from "./pages/Milestones";
import Checkin from "./pages/Checkin";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/recognize" element={<ProtectedRoute><Recognize /></ProtectedRoute>} />
            <Route path="/vote" element={<ProtectedRoute><Vote /></ProtectedRoute>} />
            <Route path="/awards" element={<ProtectedRoute><Awards /></ProtectedRoute>} />
            <Route path="/milestones" element={<ProtectedRoute><Milestones /></ProtectedRoute>} />
            <Route path="/checkin" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/my-recognitions" element={<ProtectedRoute><MyRecognitions /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/diploma/:slug" element={<MiDiploma />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
~~~

### Archivo: `src/components/game/AwardsAdmin.tsx`

~~~tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePeople, useWeekAwards, useWeekAwardVotes } from "@/hooks/useGame";
import { AwardCategory, awardStandings, pillarOf } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import PlayerAvatar from "./PlayerAvatar";

/** Admin: choose which awards are active for a week and see live standings. */
const AwardsAdmin = ({ weekId }: { weekId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: active = [] } = useWeekAwards(weekId, { ensure: false });
  const { data: votes = [] } = useWeekAwardVotes(weekId);
  const { data: people = [] } = usePeople();
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  const { data: catalog = [], error } = useQuery({
    queryKey: ["award-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("award_categories").select("*").order("sort_order");
      if (error) throw error;
      return data as AwardCategory[];
    },
  });

  const activeIds = new Set(active.map((c) => c.id));

  const toggle = async (c: AwardCategory) => {
    const isOn = activeIds.has(c.id);
    if (isOn && votes.some((v) => v.category_id === c.id) && !confirm("Este premio ya tiene votos. ¿Quitarlo de la semana? (los votos se conservan)")) return;
    const { error } = isOn
      ? await supabase.from("week_awards").delete().eq("week_id", weekId).eq("category_id", c.id)
      : await supabase.from("week_awards").insert({ week_id: weekId, category_id: c.id, position: active.length + 1 });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["week-awards", weekId] });
  };

  const autoAssign = async () => {
    const { error } = await supabase.rpc("ensure_week_awards", { _week_id: weekId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["week-awards", weekId] });
  };

  if (error) {
    return (
      <div className="glass-card p-6 text-sm text-muted-foreground">
        Falta aplicar la migración <code>20261016000000_gamification.sql</code> en Supabase.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="hud-label">Premios activos esta semana ({active.length}) · recomendado: 5</p>
          {active.length === 0 && (
            <button onClick={autoAssign} className="text-xs text-accent hover:underline">
              Asignar rotación automática
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalog.map((c) => {
            const on = activeIds.has(c.id);
            const pillar = pillarOf(c.pillar);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c)}
                className={cn(
                  "text-left rounded-xl border p-3 flex gap-3 items-start transition-all",
                  on ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100",
                )}
              >
                <span className="text-2xl">{c.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                  <span className="chip text-[10px] px-2 py-0.5 mt-1" style={{ background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }}>
                    {pillar.label}
                  </span>
                </div>
                <span className={cn("ml-auto text-xs font-hud", on ? "text-primary" : "text-muted-foreground")}>{on ? "ACTIVO" : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((c) => {
          const standings = awardStandings(c.id, votes);
          return (
            <div key={c.id} className="glass-card p-4">
              <p className="font-display text-sm text-gold-gradient mb-3">
                {c.emoji} {c.name}
              </p>
              {standings.length === 0 && <p className="text-xs text-muted-foreground">Sin votos aún</p>}
              <ol className="space-y-2">
                {standings.slice(0, 5).map((s, i) => (
                  <li key={s.personId} className="flex items-center gap-2">
                    <span className={cn("font-display text-xs w-4", i === 0 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                    <PlayerAvatar name={peopleById[s.personId]?.name || "?"} photoUrl={peopleById[s.personId]?.photo_url} size={24} ring="none" />
                    <span className="text-sm flex-1 truncate">{peopleById[s.personId]?.name}</span>
                    <span className="font-hud text-xs">{s.rockets}🚀 · {s.votes}v</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AwardsAdmin;
~~~

### Archivo: `src/components/game/CheckinsAdmin.tsx`

~~~tsx
import { usePeople, useWeekCheckins, useWeekMilestones } from "@/hooks/useGame";
import { moodOf, SpeedId, SPEEDS, SURVEY_QUESTIONS } from "@/lib/gamification";
import PlayerAvatar from "./PlayerAvatar";
import ClimateMeter from "./ClimateMeter";

const ORDER: SpeedId[] = ["bajo", "crucero", "maximo"];

/** Admin/HR: private view of every self-evaluation (who asked for support and lowest mood first). */
const CheckinsAdmin = ({ weekId }: { weekId: string }) => {
  const { data: checkins = [] } = useWeekCheckins(weekId);
  const { data: people = [] } = usePeople();
  const { data: milestones = [] } = useWeekMilestones(weekId);
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const msById = Object.fromEntries(milestones.map((m) => [m.id, m]));
  const pending = people.filter((p) => p.user_id && p.approved !== false && !checkins.some((c) => c.person_id === p.id));
  const sorted = [...checkins].sort(
    (a, b) =>
      Number(!!b.wants_support) - Number(!!a.wants_support) ||
      (a.mood ?? 6) - (b.mood ?? 6) ||
      ORDER.indexOf(a.speed) - ORDER.indexOf(b.speed),
  );
  const moodCounts: Record<number, number> = {};
  checkins.forEach((c) => {
    if (c.mood) moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
  });
  const supportCount = checkins.filter((c) => c.wants_support).length;

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <p className="hud-label mb-3">Clima del equipo (indicador principal)</p>
        <ClimateMeter counts={moodCounts} nudge={false} />
        {supportCount > 0 && (
          <p className="mt-3 text-sm text-accent">🫂 {supportCount} persona{supportCount !== 1 && "s"} pidió que le echen la mano. Aparecen primero abajo.</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {ORDER.map((id) => (
          <div key={id} className="glass-card p-4 text-center">
            <p className="text-2xl">{SPEEDS[id].emoji}</p>
            <p className="font-display text-2xl" style={{ color: `hsl(${SPEEDS[id].hue})` }}>
              {checkins.filter((c) => c.speed === id).length}
            </p>
            <p className="hud-label">{SPEEDS[id].label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4">
          <p className="hud-label mb-2">Sin autoevaluación ({pending.length})</p>
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-muted/50 pl-0.5 pr-2.5 py-0.5 text-xs">
                <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={20} ring="none" /> {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {sorted.map((c) => {
        const p = c.person_id ? byId[c.person_id] : null;
        const sp = SPEEDS[c.speed];
        const mood = moodOf(c.mood);
        return (
          <div key={c.id} className="glass-card p-4 flex gap-4" style={{ borderLeft: `4px solid hsl(${(mood ?? sp).hue})` }}>
            <PlayerAvatar name={p?.name || "?"} photoUrl={p?.photo_url} size={44} ring="none" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p?.name || "Usuario sin persona vinculada"}</p>
                {mood && (
                  <span className="chip text-sm" style={{ background: `hsl(${mood.hue} / 0.15)`, color: `hsl(${mood.hue})` }}>
                    {mood.emoji} {mood.label}
                  </span>
                )}
                <span className="chip" style={{ background: `hsl(${sp.hue} / 0.15)`, color: `hsl(${sp.hue})` }}>
                  {sp.emoji} {sp.label}
                </span>
                {c.wants_support && <span className="chip bg-accent/20 text-accent">🫂 Pidió apoyo</span>}
              </div>
              <p className="text-sm text-foreground/90">
                <span className="text-muted-foreground">{sp.prompt.replace("…", "")}</span> {c.reason}
              </p>
              {c.blockers?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.blockers.map((b) => (
                    <span key={b} className="chip bg-destructive/15 text-destructive text-[11px]">
                      {b}
                    </span>
                  ))}
                </div>
              )}
              {c.next_step && <p className="text-xs text-accent">➜ {c.next_step}</p>}
              {c.milestone_ids?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  🏁 {c.milestone_ids.map((id) => msById[id]?.title).filter(Boolean).join(" · ")}
                </p>
              )}
              {Object.keys(c.ratings || {}).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Auto (vale ½):{" "}
                  {SURVEY_QUESTIONS.filter((q) => c.ratings[q.id]).map((q) => `${q.emoji}${"🚀".repeat(c.ratings[q.id])}`).join("  ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {checkins.length === 0 && <p className="text-sm text-muted-foreground">Nadie ha enviado su autoevaluación esta semana.</p>}
    </div>
  );
};

export default CheckinsAdmin;
~~~


### Cambios en `src/pages/Admin.tsx` (NO reemplaces el archivo completo; solo aplica estos cambios puntuales)

1. Imports:
   - Cambia `import { useState } from "react";` por `import { useEffect, useState } from "react";`
   - Cambia `import { useNavigate } from "react-router-dom";` por `import { useNavigate, useSearchParams } from "react-router-dom";`
   - Debajo de `import CelebrationExperience from "@/components/CelebrationExperience";` agrega:
~~~tsx
import AwardsAdmin from "@/components/game/AwardsAdmin";
import CheckinsAdmin from "@/components/game/CheckinsAdmin";
~~~

2. Justo debajo de `const [showCelebration, setShowCelebration] = useState(false);` agrega:
~~~tsx
  const [searchParams, setSearchParams] = useSearchParams();
  // /admin?present=1 (button on the home dashboard) opens the presentation directly
  useEffect(() => {
    if (searchParams.get("present") === "1") {
      setShowCelebration(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
~~~

3. En `<TabsList className="bg-muted/50">` cambia la clase a `"bg-muted/50 flex-wrap h-auto"` y, después del TabsTrigger de "Votos", agrega:
~~~tsx
            <TabsTrigger value="awards"><Trophy className="h-4 w-4 mr-1" /> Premios</TabsTrigger>
            <TabsTrigger value="checkins">🪞 Autoevaluación</TabsTrigger>
~~~

4. Antes de `<TabsContent value="users">` agrega:
~~~tsx
          <TabsContent value="checkins">
            {activeWeekId && <CheckinsAdmin weekId={activeWeekId} />}
          </TabsContent>

          <TabsContent value="awards">
            {activeWeekId && <AwardsAdmin weekId={activeWeekId} />}
          </TabsContent>
~~~

---

