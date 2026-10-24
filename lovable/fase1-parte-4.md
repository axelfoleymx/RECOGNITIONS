# FASE 1 · PARTE 4 DE 4 — Rocketing Recognitions

Crea o reemplaza cada archivo EXACTAMENTE con el contenido indicado (completo, sin resumir ni rediseñar). No toques otros archivos ni el login, y no borres datos.

### Archivo: `src/pages/Awards.tsx`

~~~tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useWeekAwards, useWeekAwardVotes, useWeekRecognitions } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import AwardsShowcase, { ProposeInput } from "@/components/game/AwardsShowcase";
import { timeLeft } from "@/lib/gamification";

export const AwardsHeader = ({ endDate }: { endDate?: string }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
    <div>
      <p className="hud-label text-neon">Temporada semanal</p>
      <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">Premios de la Semana</h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl">
        Estos son los premios en juego. Se votan en la encuesta de Recognitions y hay un ganador por cada uno.
      </p>
    </div>
    {endDate && (
      <div className="glass-card px-4 py-2 text-right">
        <p className="hud-label">Cierra en</p>
        <p className="font-display text-xl text-primary">{timeLeft(endDate).label}</p>
      </div>
    )}
  </div>
);

const Awards = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: categories = [], isLoading } = useWeekAwards(week?.id);
  const { data: recs = [] } = useWeekRecognitions(week?.id);
  const { data: legacyVotes = [] } = useWeekAwardVotes(week?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mentions = useMemo(() => {
    const t: Record<string, number> = {};
    recs.forEach((r) => r.question_id && (t[r.question_id] = (t[r.question_id] || 0) + 1));
    legacyVotes.forEach((v) => (t[v.category_id] = (t[v.category_id] || 0) + 1));
    return t;
  }, [recs, legacyVotes]);

  const surveyDone = recs.some((r) => r.author_user_id === user?.id && r.question_id);

  const onPropose = async ({ name, description, emoji, pillar }: ProposeInput) => {
    if (!week) return;
    const { error } = await supabase.rpc("propose_week_award", {
      _week_id: week.id,
      _name: name,
      _description: description,
      _emoji: emoji,
      _pillar: pillar,
    });
    if (error) {
      toast({ title: "No se pudo crear", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "¡Premio extra creado! ⭐", description: "Ya aparece en la encuesta de todos." });
    queryClient.invalidateQueries({ queryKey: ["week-awards"] });
  };

  return (
    <GameShell>
      <AwardsHeader endDate={week?.end_date} />
      {!isLoading && categories.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          Los premios de esta semana aún no están configurados. Un admin puede elegirlos en Admin → Premios.
        </div>
      ) : (
        <AwardsShowcase
          categories={categories}
          mentions={mentions}
          surveyDone={surveyDone}
          locked={week?.status !== "open"}
          canPropose={!categories.some((c) => c.is_custom)}
          onPropose={onPropose}
          onVote={() => navigate("/recognize")}
        />
      )}
    </GameShell>
  );
};

export default Awards;
~~~

### Archivo: `src/pages/Checkin.tsx`

~~~tsx
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useMyCheckin, useMyPerson, usePeople, useWeekAwards, useWeekMilestones } from "@/hooks/useGame";
import { questionsFromCategories } from "@/lib/gamification";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import SelfCheckinPanel, { CheckinInput } from "@/components/game/SelfCheckinPanel";

const Checkin = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: me } = useMyPerson();
  const { data: milestones = [] } = useWeekMilestones(week?.id);
  const { data: categories = [] } = useWeekAwards(week?.id);
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
        questions={questionsFromCategories(categories)}
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

### Archivo: `src/pages/Index.tsx`

~~~tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import {
  useMoodPulse,
  useMyCheckin,
  useMyPerson,
  usePeople,
  usePlayerStats,
  useWeekAwards,
  useWeekAwardVotes,
  useWeekMilestones,
  useWeekRecognitions,
} from "@/hooks/useGame";
import GameShell from "@/components/game/GameShell";
import HomeHud from "@/components/game/HomeHud";
import UpcomingBirthdays from "@/components/UpcomingBirthdays";
import VictoryVideo from "@/components/VictoryVideo";
import PeopleCarousel from "@/components/PeopleCarousel";
import { buildWeekSummary, EMPTY_STATS } from "@/lib/gamification";

const Index = () => {
  const { user, profileName, isAdmin } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: me = null } = useMyPerson();
  const { data: stats = EMPTY_STATS } = usePlayerStats();
  const { data: categories = [] } = useWeekAwards(week?.id);
  const { data: awardVotes = [] } = useWeekAwardVotes(week?.id);
  const { data: recognitions = [] } = useWeekRecognitions(week?.id);
  const { data: milestones = [] } = useWeekMilestones(week?.id);
  const { data: myCheckin } = useMyCheckin(week?.id);
  const { data: moodPulse } = useMoodPulse(week?.id);

  const { data: rocketerVotes = [] } = useQuery({
    queryKey: ["week-pulse", "rocketer-voters", week?.id],
    enabled: !!week,
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("voter_user_id").eq("week_id", week!.id);
      return data || [];
    },
  });

  const summary = useMemo(
    () =>
      buildWeekSummary({
        userId: user?.id ?? null,
        people,
        recognitions,
        awardVotes,
        milestones,
        categoriesCount: categories.length,
        votedRocketer: rocketerVotes.some((v) => v.voter_user_id === user?.id),
        rocketerVoters: rocketerVotes.length,
        checkinDone: !!myCheckin,
        myPersonId: me?.id,
      }),
    [user?.id, people, recognitions, awardVotes, milestones, categories.length, rocketerVotes, me?.id, myCheckin],
  );

  // Votes per award: survey answers (one question per award) + legacy award votes
  const voteTotals = useMemo(() => {
    const t: Record<string, number> = {};
    recognitions.forEach((r) => r.question_id && (t[r.question_id] = (t[r.question_id] || 0) + 1));
    awardVotes.forEach((v) => (t[v.category_id] = (t[v.category_id] || 0) + 1));
    return t;
  }, [recognitions, awardVotes]);

  const weekLabel = week
    ? `${format(parseISO(week.start_date), "d MMM", { locale: es })} – ${format(parseISO(week.end_date), "d MMM yyyy", { locale: es })}`
    : "";

  return (
    <GameShell>
      <HomeHud
        playerName={profileName || me?.name || "Rocketer"}
        myPerson={me}
        stats={stats}
        systems={summary.systems}
        moodPulse={moodPulse}
        weekKey={week?.id}
        categories={categories}
        voteTotals={voteTotals}
        myAwardVotes={summary.myAwardVotes}
        votedRocketer={rocketerVotes.some((v) => v.voter_user_id === user?.id)}
        radar={summary.radar.filter((p) => p.user_id !== user?.id)}
        milestones={milestones}
        peopleById={summary.peopleById}
        team={summary.team}
        isAdmin={isAdmin}
        topSlot={<UpcomingBirthdays featured />}
        topGivers={summary.topGivers}
        weekLabel={weekLabel}
        endDate={week?.end_date}
      />
      <div className="flex flex-col items-center mt-10">
        <PeopleCarousel />
        <VictoryVideo />
      </div>
    </GameShell>
  );
};

export default Index;
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
import { questionsFromCategories } from "@/lib/gamification";
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

  // Like the previous version, everyone active can be recognized; people still
  // waiting for admin approval show a "Nuevo" tag.
  const newPersonIds = useMemo(() => new Set(people.filter((p) => p.approved === false).map((p) => p.id)), [people]);
  const radarIds = useMemo(() => {
    const got = new Set(weekRecs.map((r) => r.recognized_person_id));
    return new Set(people.filter((p) => p.approved !== false && !got.has(p.id)).map((p) => p.id));
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
        .insert({ name: newName.trim(), type: "team", photo_url: photoUrl, approved: false })
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

## Archivos a eliminar

- `src/components/celebration/SurveyPhase.tsx` (ya no se usa)
- `src/components/game/AwardsArena.tsx` (ya no se usa)

## Al terminar

Verifica que compile sin errores. Si algo falla, dime el error exacto en lugar de reescribir archivos.
