import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { usePeople, useWeekMilestones } from "@/hooks/useGame";
import { useToast } from "@/hooks/use-toast";
import GameShell from "@/components/game/GameShell";
import MilestonesBoard, { MilestoneInput } from "@/components/game/MilestonesBoard";

const Milestones = () => {
  const { user, isAdmin } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: milestones = [] } = useWeekMilestones(week?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["player-stats"] });
  };

  const onCreate = async ({ participants, ...m }: MilestoneInput) => {
    if (!week || !user) return;
    const { data, error } = await supabase
      .from("milestones")
      .insert({ ...m, week_id: week.id, created_by: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: "No se pudo registrar", description: error.message, variant: "destructive" });
      throw error;
    }
    const { error: pErr } = await supabase
      .from("milestone_participants")
      .insert(participants.map((person_id) => ({ milestone_id: data.id, person_id })));
    if (pErr) toast({ title: "Error al agregar participantes", description: pErr.message, variant: "destructive" });
    toast({ title: "¡Hito registrado! 🏁" });
    refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar este hito?")) return;
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    refresh();
  };

  return (
    <GameShell>
      <div className="mb-6">
        <p className="hud-label text-neon">Bitácora de misión</p>
        <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient">Hitos de la Semana</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Logros reales y medibles: entregas, clientes, resultados. Cada participante gana XP y el hito aparece en la presentación.
        </p>
      </div>
      <MilestonesBoard
        people={people.filter((p) => p.approved !== false)}
        milestones={milestones}
        myUserId={user?.id ?? null}
        isAdmin={isAdmin}
        onCreate={onCreate}
        onDelete={onDelete}
      />
    </GameShell>
  );
};

export default Milestones;
