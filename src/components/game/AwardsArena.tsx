import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import {
  AwardCategory,
  AwardVote,
  firstName,
  GamePerson,
  MAX_AWARDS_PER_NOMINEE,
  MAX_SELF_NOMINATIONS,
  pillarOf,
  RECOGNITION_PILLARS,
  SELF_WEIGHT,
  XP,
} from "@/lib/gamification";
import Trophy from "./Trophy";
import PlayerAvatar from "./PlayerAvatar";
import RocketPicker from "./RocketPicker";
import XpBar from "./XpBar";
import { PeopleTray } from "./DragPeople";
import GameButton from "./GameButton";

export type CastInput = { categoryId: string; personId: string; rockets: number; reason: string };
export type ProposeInput = { name: string; description: string; emoji: string; pillar: string };

const CUSTOM_EMOJIS = ["🏅", "🦸", "🧠", "🎯", "🔥", "💎", "🧲", "🛠️", "🎤", "📣", "🧪", "🐐"];

interface AwardsArenaProps {
  people: GamePerson[];
  categories: AwardCategory[];
  /** current user's votes this week */
  myVotes: AwardVote[];
  /** total voters per category (shown without revealing the leader) */
  voteTotals: Record<string, number>;
  myUserId: string | null;
  locked?: boolean;
  onCast: (v: CastInput) => Promise<void>;
  onClear: (categoryId: string) => Promise<void>;
  /** team can still add this week's single extra award */
  canPropose?: boolean;
  onPropose?: (a: ProposeInput) => Promise<void>;
}

const AwardsArena = ({ people, categories, myVotes, voteTotals, myUserId, locked, onCast, onClear, canPropose, onPropose }: AwardsArenaProps) => {
  const [proposing, setProposing] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pEmoji, setPEmoji] = useState(CUSTOM_EMOJIS[0]);
  const [pPillar, setPPillar] = useState<string>("actitud");
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ categoryId: string; personId: string } | null>(null);
  const [rockets, setRockets] = useState(2);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const voteByCat = useMemo(() => Object.fromEntries(myVotes.map((v) => [v.category_id, v])), [myVotes]);
  const usesByPerson = useMemo(() => {
    const m: Record<string, number> = {};
    myVotes.forEach((v) => (m[v.nominee_person_id] = (m[v.nominee_person_id] || 0) + 1));
    return m;
  }, [myVotes]);

  const isMe = (personId: string) => !!myUserId && peopleById[personId]?.user_id === myUserId;
  const selfUses = myVotes.filter((v) => isMe(v.nominee_person_id)).length;

  const canDrop = (personId: string, categoryId: string) => {
    const person = peopleById[personId];
    if (!person) return "Persona no encontrada";
    const current = voteByCat[categoryId];
    if (isMe(personId) && selfUses - (current && isMe(current.nominee_person_id) ? 1 : 0) >= MAX_SELF_NOMINATIONS)
      return `Solo ${MAX_SELF_NOMINATIONS} autonominación por semana (vale ½)`;
    const uses = (usesByPerson[personId] || 0) - (current?.nominee_person_id === personId ? 1 : 0);
    if (uses >= MAX_AWARDS_PER_NOMINEE) return `Ya le diste ${MAX_AWARDS_PER_NOMINEE} premios. ¡Reparte la gloria!`;
    return null;
  };

  const [warning, setWarning] = useState<string | null>(null);
  const handleDrop = (personId: string, categoryId: string) => {
    if (locked) return;
    if (!categories.some((c) => c.id === categoryId)) return;
    const problem = canDrop(personId, categoryId);
    if (problem) {
      setWarning(problem);
      setTimeout(() => setWarning(null), 2600);
      return;
    }
    const current = voteByCat[categoryId];
    setRockets(current?.nominee_person_id === personId ? current.rockets : 2);
    setReason(current?.nominee_person_id === personId ? current.reason : "");
    setPending({ categoryId, personId });
  };

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onCast({ ...pending, rockets, reason: reason.trim() });
      setPending(null);
      setBurst((b) => b + 1);
    } finally {
      setSaving(false);
    }
  };

  const done = categories.filter((c) => voteByCat[c.id]).length;
  const pendingCat = pending && categories.find((c) => c.id === pending.categoryId);
  const pendingPerson = pending && peopleById[pending.personId];

  return (
    <div className="space-y-6">
      <EmojiBurst triggerSignal={burst} />

      {/* progress */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="hud-label">Progreso de votación</span>
            <span className="font-hud text-sm text-foreground">
              {done}/{categories.length} · <span className="text-xp">+{done * XP.castAwardVote} XP</span>
            </span>
          </div>
          <XpBar value={categories.length ? done / categories.length : 0} />
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-xs">
          Máx. {MAX_AWARDS_PER_NOMINEE} premios por persona · puedes autonominarte en 1 (vale ½) · 1–3 🚀 según el impacto.
        </p>
      </div>

      {/* trophies */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {categories.map((c, i) => {
          const vote = voteByCat[c.id];
          const nominee = vote && peopleById[vote.nominee_person_id];
          const hovered = hoverZone === c.id;
          const pillar = pillarOf(c.pillar);
          return (
            <motion.div
              key={c.id}
              data-dropzone={c.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => {
                if (selected) {
                  handleDrop(selected, c.id);
                  setSelected(null);
                }
              }}
              className={cn(
                "relative rounded-2xl border p-3 md:p-4 flex flex-col items-center text-center transition-all bg-card/70 backdrop-blur-xl",
                hovered || (selected && !locked)
                  ? "border-primary shadow-[0_0_0_2px_hsl(var(--star-gold)/0.6),0_0_40px_hsl(var(--star-gold)/0.35)]"
                  : vote
                    ? "border-primary/40"
                    : "border-border/60",
                selected && "cursor-pointer",
              )}
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

              <div className="relative mt-1">
                <Trophy size={78} emoji={c.emoji} active={hovered} />
                <AnimatePresence>
                  {nominee && (
                    <motion.div
                      key={nominee.id}
                      initial={{ scale: 0, y: -40, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      className="absolute left-1/2 -translate-x-1/2 top-3"
                    >
                      <PlayerAvatar name={nominee.name} photoUrl={nominee.photo_url} size={50} ring="gold" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <h3 className="font-display text-[12px] md:text-sm font-bold text-gold-gradient mt-2 leading-tight">
                {c.name}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-3 min-h-[2.6em]">
                {c.description}
              </p>

              <div className="mt-3 w-full min-h-[44px] flex items-center justify-center">
                {nominee ? (
                  <div className="w-full flex items-center justify-between gap-1 rounded-lg bg-primary/10 px-2 py-1.5">
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{firstName(nominee.name)}</p>
                      <p className="text-[11px] leading-none">{"🚀".repeat(vote.rockets)}</p>
                    </div>
                    {!locked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClear(c.id);
                        }}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Quitar voto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-dashed border-border py-2 text-[11px] font-hud text-muted-foreground">
                    {locked ? "Votación cerrada" : "Suelta una foto aquí"}
                  </div>
                )}
              </div>
              <span className="absolute top-2 right-2 font-hud text-[10px] text-muted-foreground">
                {voteTotals[c.id] || 0} 🗳️
              </span>
            </motion.div>
          );
        })}
        {canPropose && !locked && onPropose && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={() => setProposing(true)}
            className="rounded-2xl border-2 border-dashed border-neon-magenta/60 bg-neon-magenta/5 p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[260px] hover:bg-neon-magenta/10 hover:shadow-[0_0_30px_hsl(var(--neon-magenta)/0.35)] transition-all"
          >
            <span className="text-5xl">➕</span>
            <span className="font-display text-sm font-bold text-neon-magenta">Proponer premio extra</span>
            <span className="text-[11px] text-muted-foreground">Solo 1 por semana para todo el equipo. ¡El primero que lo cree lo nombra!</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[70] chip bg-destructive text-destructive-foreground px-4 py-2 text-sm shadow-xl"
          >
            {warning}
          </motion.div>
        )}
      </AnimatePresence>

      {!locked && (
        <PeopleTray
          className="lg:sticky lg:bottom-4"
          people={people}
          selectedId={selected}
          onSelect={setSelected}
          onHover={setHoverZone}
          onDrop={handleDrop}
          stateFor={(p) => {
            if (myUserId && p.user_id === myUserId)
              return { badge: "Tú ½", hint: "Autonominación: 1 por semana, vale ½", disabled: selfUses >= MAX_SELF_NOMINATIONS };
            const uses = usesByPerson[p.id] || 0;
            if (uses >= MAX_AWARDS_PER_NOMINEE) return { badge: `${uses}/${MAX_AWARDS_PER_NOMINEE}`, hint: "Ya tiene 2 premios tuyos" };
            if (uses > 0) return { badge: `${uses}/${MAX_AWARDS_PER_NOMINEE}` };
            return undefined;
          }}
        />
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="bg-card border-primary/40 max-w-md">
          {pendingCat && pendingPerson && (
            <>
              <DialogHeader className="items-center text-center">
                <div className="relative">
                  <Trophy size={96} emoji={pendingCat.emoji} active />
                  <motion.div
                    initial={{ scale: 0, y: -30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="absolute left-1/2 -translate-x-1/2 top-4"
                  >
                    <PlayerAvatar name={pendingPerson.name} photoUrl={pendingPerson.photo_url} size={60} ring="gold" />
                  </motion.div>
                </div>
                <DialogTitle className="font-display text-gold-gradient text-lg">{pendingCat.name}</DialogTitle>
                <DialogDescription>
                  {isMe(pendingPerson.id) ? (
                    <>
                      <strong className="text-primary">Autonominación</strong>: tus 🚀 valen {SELF_WEIGHT * 100}% de un voto externo. ¿Qué tan fuerte fue?
                    </>
                  ) : (
                    <>
                      Nominas a <strong className="text-foreground">{pendingPerson.name}</strong>. ¿Qué tan fuerte fue?
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <RocketPicker value={rockets} onChange={setRockets} />
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="¿Qué hizo concretamente? (opcional, pero suma en la presentación)"
                maxLength={180}
                className="bg-muted/40 min-h-[80px]"
              />
              <GameButton onClick={confirm} disabled={saving} variant="gold" size="lg" className="w-full">
                {saving ? "Guardando..." : `🏆 Otorgar · +${XP.castAwardVote} XP`}
              </GameButton>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={proposing} onOpenChange={setProposing}>
        <DialogContent className="bg-card border-neon-magenta/50 max-w-md">
          <DialogHeader className="items-center text-center">
            <Trophy size={90} emoji={pEmoji} active />
            <DialogTitle className="font-display text-gold-gradient text-lg">{pName || "Nuevo premio"}</DialogTitle>
            <DialogDescription>Crea el premio extra de esta semana. Todos podrán votarlo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-1.5">
            {CUSTOM_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setPEmoji(e)}
                className={cn("h-10 w-10 rounded-lg text-xl border", pEmoji === e ? "border-primary bg-primary/15" : "border-border bg-muted/30")}
              >
                {e}
              </button>
            ))}
          </div>
          <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nombre (ej. El/La Salvavidas del Viernes)" maxLength={40} className="bg-muted/40" />
          <Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="¿Qué conducta premia?" maxLength={160} className="bg-muted/40 min-h-[70px]" />
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

export default AwardsArena;
