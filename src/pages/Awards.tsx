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
