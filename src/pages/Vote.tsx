import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useRecentRocketers } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import RocketerArena from "@/components/game/RocketerArena";
import { timeLeft } from "@/lib/gamification";

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
        people={people.filter((p) => p.approved !== false)}
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
