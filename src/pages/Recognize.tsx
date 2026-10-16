import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useWeekRecognitions } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import GameShell from "@/components/game/GameShell";
import RecognitionSurvey, { SurveySubmission } from "@/components/game/RecognitionSurvey";
import { questionOf } from "@/lib/gamification";
import type { TablesInsert } from "@/integrations/supabase/types";
import MyRecognitionsList from "@/components/MyRecognitionsList";
import ImageCropper from "@/components/ImageCropper";
import { UserPlus } from "lucide-react";

const Recognize = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: weekRecs = [] } = useWeekRecognitions(week?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // "Not in the list" — add a guest person (pending admin approval)
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState("");
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const surveyDone = weekRecs.some((r) => r.author_user_id === user?.id && r.question_id);

  const onSubmit = async ({ answers, extra, anonymous }: SurveySubmission) => {
    if (!week || !user) throw new Error("No week or user");
    const rows: TablesInsert<"recognitions">[] = answers.map((a) => {
      const q = questionOf(a.questionId)!;
      return {
        week_id: week.id,
        recognized_person_id: a.personId,
        author_user_id: user.id,
        is_anonymous: anonymous,
        message: a.comment || q.statement,
        pillar: q.pillar,
        question_id: a.questionId,
        rating: a.rating,
      };
    });
    if (extra) {
      rows.push({
        week_id: week.id,
        recognized_person_id: extra.personId,
        author_user_id: user.id,
        is_anonymous: anonymous,
        message: extra.message,
        pillar: extra.pillar,
        question_id: null,
        rating: null,
      });
    }
    const { error } = await supabase.from("recognitions").insert(rows);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ["recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["my-recognitions"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
    queryClient.invalidateQueries({ queryKey: ["week-pulse"] });
  };

  return (
    <GameShell>
      <div className="mb-6">
        <p className="hud-label text-neon">Sistema 2 · Recognitions</p>
        <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">Recognitions de la Semana</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          5 preguntas rápidas: selecciona a quienes destacaron (desliza o marca varios a la vez), califícalos con 🚀 y, si quieres,
          deja un comentario. Al final puedes dar una medalla extra.
        </p>
      </div>

      <RecognitionSurvey
        people={people.filter((p) => p.approved !== false || p.id === addedId)}
        myUserId={user?.id ?? null}
        radarIds={radarIds}
        alreadyDone={surveyDone}
        initialPersonId={addedId ?? params.get("to")}
        onSubmit={onSubmit}
        onFinish={() => navigate("/")}
      />

      <div className="glass-card p-4 mt-5">
        {!showNew ? (
          <button onClick={() => setShowNew(true)} className="text-sm text-muted-foreground hover:text-accent flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> ¿La persona no está en la lista? Agrégala
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo" className="bg-muted/40" />
            <Input
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
            <Button onClick={addPerson} disabled={!newName.trim() || adding} className="btn-space">
              {adding ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        )}
      </div>

      {user && week && (
        <div className="max-w-3xl mx-auto">
          <MyRecognitionsList userId={user.id} weekId={week.id} />
        </div>
      )}

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
