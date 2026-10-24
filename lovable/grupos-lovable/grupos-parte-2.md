# GRUPOS · PARTE 2 DE 2 — Rocketing Recognitions

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
            El MVP del equipo Rocketing: quien más impulsó al equipo y al cliente. Quien ganó la semana pasada descansa ❄️ esta semana.
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

### Archivo: `src/pages/Recognize.tsx`

~~~tsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useWeekAwards, useWeekRecognitions } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import GameShell from "@/components/game/GameShell";
import GameButton from "@/components/game/GameButton";
import RecognitionSurvey, { SurveySubmission } from "@/components/game/RecognitionSurvey";
import { isCore, isRecent, questionsFromCategories } from "@/lib/gamification";
import type { TablesInsert } from "@/integrations/supabase/types";
import MyRecognitionsList from "@/components/MyRecognitionsList";
import ImageCropper from "@/components/ImageCropper";

const Recognize = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: categories = [] } = useWeekAwards(week?.id);
  const { data: weekRecs = [] } = useWeekRecognitions(week?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const questions = useMemo(() => questionsFromCategories(categories), [categories]);

  // "+ Agregar integrante": a guest person usable right away (an admin approves it later)
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState("");
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Like the previous version, everyone active can be recognized (all groups compete).
  // "Nuevo" marks people added in the last 7 days.
  const newPersonIds = useMemo(() => new Set(people.filter((p) => isRecent(p) || p.id === addedId).map((p) => p.id)), [people, addedId]);
  // The radar ("aún sin recognition") looks only at the Rocketing team
  const radarIds = useMemo(() => {
    const got = new Set(weekRecs.map((r) => r.recognized_person_id));
    return new Set(people.filter((p) => isCore(p) && p.approved !== false && !got.has(p.id)).map((p) => p.id));
  }, [people, weekRecs]);

  const addPerson = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      let photoUrl: string | null = null;
      if (croppedBlob) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("photos").upload(path, croppedBlob);
        if (uploadErr) throw uploadErr;
        photoUrl = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("people")
        // guests start in "Otros"; an admin moves them to their group (Admin → Personas)
        .insert({ name: newName.trim(), type: "otro", photo_url: photoUrl, approved: false })
        .select()
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["people-active"] });
      setAddedId(data.id);
      setShowNew(false);
      setNewName("");
      setCroppedBlob(null);
      setCroppedPreview(null);
      toast({ title: `¡${data.name} se unió a la tripulación! 👋`, description: "Ya puedes reconocerle. Un admin confirmará el registro." });
    } catch (err: any) {
      toast({ title: "No se pudo agregar", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const surveyDone = weekRecs.some((r) => r.author_user_id === user?.id && r.question_id);

  const onSubmit = async ({ answers, extras, anonymous }: SurveySubmission) => {
    if (!week || !user) throw new Error("No week or user");
    const byQuestion = Object.fromEntries(questions.map((q) => [q.id, q]));
    const rows: TablesInsert<"recognitions">[] = answers.map((a) => ({
      week_id: week.id,
      recognized_person_id: a.personId,
      author_user_id: user.id,
      is_anonymous: anonymous,
      message: a.comment || byQuestion[a.questionId]?.statement || "Destacó esta semana",
      pillar: byQuestion[a.questionId]?.pillar ?? null,
      question_id: a.questionId,
      rating: a.rating,
    }));
    extras.forEach((x) =>
      rows.push({
        week_id: week.id,
        recognized_person_id: x.personId,
        author_user_id: user.id,
        is_anonymous: anonymous,
        message: x.message,
        pillar: x.pillar,
        question_id: null,
        rating: null,
      }),
    );
    const { error } = await supabase.from("recognitions").insert(rows);
    if (error) {
      toast({ title: "No se pudo enviar", description: error.message, variant: "destructive" });
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ["recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["my-recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
    queryClient.invalidateQueries({ queryKey: ["week-pulse"] });
  };

  return (
    <GameShell>
      <div className="mb-4">
        <p className="hud-label text-neon">Recognitions y premios</p>
        <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">Recognitions de la Semana</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Una sola encuesta: cada pregunta es un premio de la semana y quien junte más 🚀 lo gana. ~2 minutos.
        </p>
      </div>

      <RecognitionSurvey
        key={questions.map((q) => q.id).join(",")}
        people={people}
        myUserId={user?.id ?? null}
        questions={questions}
        radarIds={radarIds}
        newPersonIds={newPersonIds}
        autoSelectId={addedId}
        alreadyDone={surveyDone}
        initialPersonId={params.get("to")}
        onAddPerson={() => setShowNew(true)}
        onSubmit={onSubmit}
        onFinish={() => navigate("/")}
      />

      {user && week && (
        <div className="max-w-3xl mx-auto">
          <MyRecognitionsList userId={user.id} weekId={week.id} />
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-card border-primary/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-gold-gradient">Agregar integrante</DialogTitle>
            <DialogDescription>Aparece al instante para que le puedas reconocer. Un admin confirma el registro después.</DialogDescription>
          </DialogHeader>
          <Input id="new-person-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre" className="bg-muted/40" />
          <div className="flex items-center gap-3">
            <Input
              id="new-person-photo"
              type="file"
              accept="image/*"
              className="bg-muted/40"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCropperSrc(URL.createObjectURL(file));
                setCropperOpen(true);
                e.target.value = "";
              }}
            />
            {croppedPreview && (
              <Avatar className="h-10 w-10 portal-ring">
                <AvatarImage src={croppedPreview} />
              </Avatar>
            )}
          </div>
          <p className="text-xs text-muted-foreground">La foto es opcional.</p>
          <GameButton variant="gold" size="lg" className="w-full" onClick={addPerson} disabled={!newName.trim() || adding}>
            {adding ? "Agregando…" : "👋 Agregar a la tripulación"}
          </GameButton>
        </DialogContent>
      </Dialog>

      <ImageCropper
        imageSrc={cropperSrc}
        open={cropperOpen}
        onConfirm={(blob, previewUrl) => {
          setCroppedBlob(blob);
          setCroppedPreview(previewUrl);
          setCropperOpen(false);
        }}
        onCancel={() => {
          setCropperOpen(false);
          setCropperSrc("");
        }}
      />
    </GameShell>
  );
};

export default Recognize;
~~~

### Archivo: `src/pages/Vote.tsx`

~~~tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useRecentRocketers } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import RocketerArena from "@/components/game/RocketerArena";
import { isCore, timeLeft } from "@/lib/gamification";

const Vote = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: cooldown = new Set<string>() } = useRecentRocketers(week?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingVote } = useQuery({
    queryKey: ["my-vote", week?.id],
    enabled: !!week && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("*, people:voted_person_id(name)")
        .eq("week_id", week!.id)
        .eq("voter_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-vote"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
    queryClient.invalidateQueries({ queryKey: ["week-pulse"] });
  };

  return (
    <GameShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
        <div>
          <p className="hud-label text-neon">Boss final</p>
          <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">
            Votar Rocketer de la Semana
          </h1>
        </div>
        {week && (
          <div className="glass-card px-4 py-2 text-right">
            <p className="hud-label">Cierra en</p>
            <p className="font-display text-xl text-primary">{timeLeft(week.end_date).label}</p>
          </div>
        )}
      </div>

      <RocketerArena
        // Rocketer (MVP) is for the Rocketing team only; externals, Idearia and fun entries compete in the awards
        people={people.filter((p) => p.approved !== false && isCore(p))}
        myUserId={user?.id ?? null}
        cooldownIds={cooldown}
        locked={week?.status !== "open"}
        existing={existingVote ? { personId: existingVote.voted_person_id, reason: existingVote.reason } : null}
        onVote={async (personId, reason) => {
          if (!week || !user) return;
          const { error } = await supabase.from("votes").insert({
            week_id: week.id,
            voter_user_id: user.id,
            voted_person_id: personId,
            reason,
          });
          if (error) {
            toast({ title: "No se pudo votar", description: error.message, variant: "destructive" });
            throw error;
          }
          toast({ title: "¡Voto registrado!", description: "Tu voto ha sido enviado 🌟" });
          refresh();
        }}
        onAnnul={async () => {
          if (!existingVote) return;
          const { error } = await supabase.from("votes").delete().eq("id", existingVote.id);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            throw error;
          }
          refresh();
        }}
      />
    </GameShell>
  );
};

export default Vote;
~~~

## Cambios puntuales en `src/pages/Admin.tsx` (NO reemplaces el archivo completo; solo estos 6 reemplazos)

1. Debajo de `import CheckinsAdmin from "@/components/game/CheckinsAdmin";` agrega:
~~~tsx
import { groupOf, GROUPS } from "@/lib/gamification";
~~~

2. Reemplaza `<span className="text-xs text-muted-foreground ml-2 capitalize">{p.type}</span>` por:
~~~tsx
<span className="text-xs text-muted-foreground ml-2">{groupOf(p).emoji} {groupOf(p).label}</span>
~~~

3. Reemplaza `<TableCell className="text-muted-foreground capitalize">{p.type}</TableCell>` por:
~~~tsx
<TableCell className="text-muted-foreground">{groupOf(p).emoji} {groupOf(p).label}</TableCell>
~~~

4. En los DOS selectores de tipo de persona (el de "Agregar persona" con `value={newPersonType}` y el de edición con `value={editType}`), reemplaza las opciones
`<SelectItem value="team">Team</SelectItem>` y `<SelectItem value="proveedor">Proveedor</SelectItem>` por:
~~~tsx
{Object.entries(GROUPS).map(([value, g]) => (
  <SelectItem key={value} value={value}>{g.emoji} {g.label}</SelectItem>
))}
~~~

5. En el selector de `newPersonType`, cambia `className="w-36 bg-muted/50 border-border"` por `className="w-48 bg-muted/50 border-border"`.

6. En el selector de `editType`, cambia `className="w-28 h-8 bg-muted/50 border-border"` por `className="w-44 h-8 bg-muted/50 border-border"`.


## Al terminar

Verifica que compile sin errores. Si algo falla, dime el error exacto en lugar de reescribir archivos.
