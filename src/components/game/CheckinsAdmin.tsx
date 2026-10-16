import { usePeople, useWeekCheckins, useWeekMilestones } from "@/hooks/useGame";
import { SpeedId, SPEEDS, SURVEY_QUESTIONS } from "@/lib/gamification";
import PlayerAvatar from "./PlayerAvatar";

const ORDER: SpeedId[] = ["bajo", "crucero", "maximo"];

/** Admin/HR: private view of every self-evaluation of the week (slowest first). */
const CheckinsAdmin = ({ weekId }: { weekId: string }) => {
  const { data: checkins = [] } = useWeekCheckins(weekId);
  const { data: people = [] } = usePeople();
  const { data: milestones = [] } = useWeekMilestones(weekId);
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const msById = Object.fromEntries(milestones.map((m) => [m.id, m]));
  const pending = people.filter((p) => p.user_id && p.approved !== false && !checkins.some((c) => c.person_id === p.id));
  const sorted = [...checkins].sort((a, b) => ORDER.indexOf(a.speed) - ORDER.indexOf(b.speed));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {ORDER.map((id) => (
          <div key={id} className="glass-card p-4 text-center">
            <p className="text-2xl">{SPEEDS[id].emoji}</p>
            <p className="font-display text-2xl" style={{ color: `hsl(${SPEEDS[id].hue})` }}>
              {checkins.filter((c) => c.speed === id).length}
            </p>
            <p className="hud-label">{SPEEDS[id].label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4">
          <p className="hud-label mb-2">Sin autoevaluación ({pending.length})</p>
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-muted/50 pl-0.5 pr-2.5 py-0.5 text-xs">
                <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={20} ring="none" /> {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {sorted.map((c) => {
        const p = c.person_id ? byId[c.person_id] : null;
        const sp = SPEEDS[c.speed];
        return (
          <div key={c.id} className="glass-card p-4 flex gap-4" style={{ borderLeft: `4px solid hsl(${sp.hue})` }}>
            <PlayerAvatar name={p?.name || "?"} photoUrl={p?.photo_url} size={44} ring="none" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p?.name || "Usuario sin persona vinculada"}</p>
                <span className="chip" style={{ background: `hsl(${sp.hue} / 0.15)`, color: `hsl(${sp.hue})` }}>
                  {sp.emoji} {sp.label}
                </span>
              </div>
              <p className="text-sm text-foreground/90">
                <span className="text-muted-foreground">{sp.prompt.replace("…", "")}</span> {c.reason}
              </p>
              {c.blockers?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.blockers.map((b) => (
                    <span key={b} className="chip bg-destructive/15 text-destructive text-[11px]">
                      {b}
                    </span>
                  ))}
                </div>
              )}
              {c.next_step && <p className="text-xs text-accent">➜ {c.next_step}</p>}
              {c.milestone_ids?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  🏁 {c.milestone_ids.map((id) => msById[id]?.title).filter(Boolean).join(" · ")}
                </p>
              )}
              {Object.keys(c.ratings || {}).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Auto (vale ½):{" "}
                  {SURVEY_QUESTIONS.filter((q) => c.ratings[q.id]).map((q) => `${q.emoji}${"🚀".repeat(c.ratings[q.id])}`).join("  ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {checkins.length === 0 && <p className="text-sm text-muted-foreground">Nadie ha enviado su autoevaluación esta semana.</p>}
    </div>
  );
};

export default CheckinsAdmin;
