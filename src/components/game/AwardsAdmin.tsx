import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePeople, useWeekAwards, useWeekAwardVotes } from "@/hooks/useGame";
import { AwardCategory, awardStandings, pillarOf } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import PlayerAvatar from "./PlayerAvatar";

/** Admin: choose which awards are active for a week and see live standings. */
const AwardsAdmin = ({ weekId }: { weekId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: active = [] } = useWeekAwards(weekId, { ensure: false });
  const { data: votes = [] } = useWeekAwardVotes(weekId);
  const { data: people = [] } = usePeople();
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  const { data: catalog = [], error } = useQuery({
    queryKey: ["award-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("award_categories").select("*").order("sort_order");
      if (error) throw error;
      return data as AwardCategory[];
    },
  });

  const activeIds = new Set(active.map((c) => c.id));

  const toggle = async (c: AwardCategory) => {
    const isOn = activeIds.has(c.id);
    if (isOn && votes.some((v) => v.category_id === c.id) && !confirm("Este premio ya tiene votos. ¿Quitarlo de la semana? (los votos se conservan)")) return;
    const { error } = isOn
      ? await supabase.from("week_awards").delete().eq("week_id", weekId).eq("category_id", c.id)
      : await supabase.from("week_awards").insert({ week_id: weekId, category_id: c.id, position: active.length + 1 });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["week-awards", weekId] });
  };

  const autoAssign = async () => {
    const { error } = await supabase.rpc("ensure_week_awards", { _week_id: weekId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["week-awards", weekId] });
  };

  if (error) {
    return (
      <div className="glass-card p-6 text-sm text-muted-foreground">
        Falta aplicar la migración <code>20261016000000_gamification.sql</code> en Supabase.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="hud-label">Premios activos esta semana ({active.length}) · recomendado: 5</p>
          {active.length === 0 && (
            <button onClick={autoAssign} className="text-xs text-accent hover:underline">
              Asignar rotación automática
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalog.map((c) => {
            const on = activeIds.has(c.id);
            const pillar = pillarOf(c.pillar);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c)}
                className={cn(
                  "text-left rounded-xl border p-3 flex gap-3 items-start transition-all",
                  on ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100",
                )}
              >
                <span className="text-2xl">{c.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                  <span className="chip text-[10px] px-2 py-0.5 mt-1" style={{ background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }}>
                    {pillar.label}
                  </span>
                </div>
                <span className={cn("ml-auto text-xs font-hud", on ? "text-primary" : "text-muted-foreground")}>{on ? "ACTIVO" : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((c) => {
          const standings = awardStandings(c.id, votes);
          return (
            <div key={c.id} className="glass-card p-4">
              <p className="font-display text-sm text-gold-gradient mb-3">
                {c.emoji} {c.name}
              </p>
              {standings.length === 0 && <p className="text-xs text-muted-foreground">Sin votos aún</p>}
              <ol className="space-y-2">
                {standings.slice(0, 5).map((s, i) => (
                  <li key={s.personId} className="flex items-center gap-2">
                    <span className={cn("font-display text-xs w-4", i === 0 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                    <PlayerAvatar name={peopleById[s.personId]?.name || "?"} photoUrl={peopleById[s.personId]?.photo_url} size={24} ring="none" />
                    <span className="text-sm flex-1 truncate">{peopleById[s.personId]?.name}</span>
                    <span className="font-hud text-xs">{s.rockets}🚀 · {s.votes}v</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AwardsAdmin;
