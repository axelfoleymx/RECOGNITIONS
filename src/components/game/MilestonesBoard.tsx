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
