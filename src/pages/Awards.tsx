import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useWeekAwards, useWeekAwardVotes } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import AwardsArena, { CastInput, ProposeInput } from "@/components/game/AwardsArena";
import { timeLeft } from "@/lib/gamification";

export const AwardsHeader = ({ endDate }: { endDate?: string }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
    <div>
      <p className="hud-label text-neon">Temporada semanal</p>
      <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">
        Premios de la Semana
      </h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl">
        Arrastra la foto de un compañero al trofeo que se ganó. Votas conductas concretas, no popularidad. Puedes proponer 1 premio extra por semana.
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
  const { data: people = [] } = usePeople();
  const { data: categories = [], isLoading } = useWeekAwards(week?.id);
  const { data: votes = [] } = useWeekAwardVotes(week?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const myVotes = useMemo(() => votes.filter((v) => v.voter_user_id === user?.id), [votes, user?.id]);
  const voteTotals = useMemo(() => {
    const t: Record<string, number> = {};
    votes.forEach((v) => (t[v.category_id] = (t[v.category_id] || 0) + 1));
    return t;
  }, [votes]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["award-votes"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
  };

  const onCast = async ({ categoryId, personId, rockets, reason }: CastInput) => {
    if (!week || !user) return;
    const { error } = await supabase.from("award_votes").upsert(
      {
        week_id: week.id,
        category_id: categoryId,
        voter_user_id: user.id,
        nominee_person_id: personId,
        rockets,
        reason,
      },
      { onConflict: "week_id,category_id,voter_user_id" },
    );
    if (error) {
      toast({ title: "No se pudo votar", description: error.message, variant: "destructive" });
      throw error;
    }
    refresh();
  };

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
    toast({ title: "¡Premio extra creado! ⭐", description: "Ya aparece para todo el equipo." });
    queryClient.invalidateQueries({ queryKey: ["week-awards"] });
  };

  const onClear = async (categoryId: string) => {
    const v = myVotes.find((x) => x.category_id === categoryId);
    if (!v) return;
    const { error } = await supabase.from("award_votes").delete().eq("id", v.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    refresh();
  };

  return (
    <GameShell>
      <AwardsHeader endDate={week?.end_date} />
      {!isLoading && categories.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          Los premios de esta semana aún no están configurados. Pide a un admin que aplique la migración de
          gamificación o elija los premios en Admin → Premios.
        </div>
      ) : (
        <AwardsArena
          people={people.filter((p) => p.approved !== false)}
          categories={categories}
          myVotes={myVotes}
          voteTotals={voteTotals}
          myUserId={user?.id ?? null}
          locked={week?.status !== "open"}
          onCast={onCast}
          onClear={onClear}
          canPropose={!categories.some((c) => c.is_custom)}
          onPropose={onPropose}
        />
      )}
    </GameShell>
  );
};

export default Awards;
