import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { useMyCheckin, useMyPerson, usePeople, useWeekMilestones } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import SelfCheckinPanel, { CheckinInput } from "@/components/game/SelfCheckinPanel";

const Checkin = () => {
  const { user } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: me } = useMyPerson();
  const { data: milestones = [] } = useWeekMilestones(week?.id);
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
