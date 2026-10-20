import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { climateIndex, climateLabel, MOODS } from "@/lib/gamification";

interface ClimateMeterProps {
  /** anonymous counts per mood value (1–5) */
  counts: Record<number | string, number>;
  size?: "md" | "xl";
  /** show the empathy nudge for the team */
  nudge?: boolean;
  className?: string;
}

const indexColor = (i: number) => (i >= 50 ? "var(--star-gold)" : i >= 20 ? "var(--xp-green)" : i >= 0 ? "var(--nebula-cyan)" : "var(--destructive)");

/** Team climate (eNPS-style): index −100…+100 plus the face distribution. Anonymous by design. */
const ClimateMeter = ({ counts, size = "md", nudge = true, className }: ClimateMeterProps) => {
  const c = climateIndex(counts);
  const xl = size === "xl";
  const sad = MOODS.filter((m) => m.value <= 2).reduce((t, m) => t + Number(counts[m.value] || 0), 0);

  if (!c.total) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Aún no hay autoevaluaciones esta semana. El clima del equipo aparecerá aquí, siempre anónimo.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className={cn("flex items-end gap-3", xl && "justify-center gap-6")}>
        <span
          className={cn("font-display font-black leading-none tabular-nums", xl ? "text-7xl md:text-9xl" : "text-4xl")}
          style={{ color: `hsl(${indexColor(c.index)})` }}
        >
          {c.index > 0 ? `+${c.index}` : c.index}
        </span>
        <div className={cn("pb-1", xl && "pb-3")}>
          <p className={cn("font-display font-bold", xl ? "text-2xl md:text-3xl" : "text-base")}>{climateLabel(c.index)}</p>
          <p className={cn("text-muted-foreground", xl ? "text-base" : "text-xs")}>
            Índice de clima · {c.total} respuesta{c.total !== 1 && "s"}
          </p>
        </div>
      </div>

      {/* distribution, happiest first */}
      <div className={cn("flex w-full overflow-hidden rounded-full bg-muted/50", xl ? "h-6" : "h-3")}>
        {MOODS.map((m) => {
          const n = Number(counts[m.value] || 0);
          if (!n) return null;
          return (
            <motion.div
              key={m.value}
              title={`${m.label}: ${n}`}
              initial={{ width: 0 }}
              animate={{ width: `${(n / c.total) * 100}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: `hsl(${m.hue})` }}
            />
          );
        })}
      </div>
      <div className={cn("grid grid-cols-5 text-center", xl ? "gap-4" : "gap-1")}>
        {MOODS.map((m) => (
          <div key={m.value} className={cn("rounded-lg", xl ? "py-3 bg-muted/30" : "py-1")}>
            <p className={xl ? "text-5xl md:text-6xl" : "text-lg leading-none"}>{m.emoji}</p>
            <p className={cn("font-display tabular-nums", xl ? "text-3xl mt-1" : "text-sm")} style={{ color: `hsl(${m.hue})` }}>
              {Number(counts[m.value] || 0)}
            </p>
            {xl && <p className="text-xs text-muted-foreground">{m.label}</p>}
          </div>
        ))}
      </div>

      {nudge && sad > 0 && (
        <p className={cn("rounded-xl border border-accent/30 bg-accent/10 text-foreground/90", xl ? "p-4 text-lg text-center" : "p-3 text-xs")}>
          🫂 {sad} {sad === 1 ? "compañero no tuvo" : "compañeros no tuvieron"} una buena semana. Un café, una ayuda o un recognition hacen la diferencia.
        </p>
      )}
    </div>
  );
};

export default ClimateMeter;
