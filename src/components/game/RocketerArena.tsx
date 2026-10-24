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
