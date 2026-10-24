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
