import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { firstName, LaunchSystem, timeLeft } from "@/lib/gamification";
import Confetti from "@/components/celebration/Confetti";
import GameButton from "./GameButton";
import XpBar from "./XpBar";

interface LaunchPanelProps {
  systems: LaunchSystem[];
  playerName: string;
  weekLabel: string;
  weekKey?: string;
  endDate?: string;
  onGo: (to: string) => void;
}

const RocketShip = ({ fuel, launching }: { fuel: number; launching: boolean }) => (
  <motion.svg
    viewBox="0 0 100 210"
    className="w-24 md:w-28 overflow-visible"
    animate={
      launching
        ? { y: -900, rotate: 0 }
        : fuel >= 1
          ? { x: [0, -1.5, 1.5, -1, 1, 0] }
          : fuel > 0
            ? { x: [0, -0.6, 0.6, 0] }
            : {}
    }
    transition={launching ? { duration: 2.2, ease: [0.5, 0, 0.9, 0.4] } : { repeat: Infinity, duration: fuel >= 1 ? 0.25 : 0.6 }}
    aria-hidden
  >
    <defs>
      <linearGradient id="hull" x1="0" x2="1">
        <stop offset="0%" stopColor="#9AA3C7" />
        <stop offset="45%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#7C86B0" />
      </linearGradient>
      <linearGradient id="flame" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FFF3B8" />
        <stop offset="40%" stopColor="#FFB020" />
        <stop offset="100%" stopColor="#FF3D6E" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* flame */}
    {fuel > 0 && (
      <motion.path
        d="M38 160 Q50 215 62 160 Z"
        fill="url(#flame)"
        style={{ originY: 0 }}
        animate={{ scaleY: launching ? [1.6, 2.2, 1.8] : [0.5 + fuel * 0.6, 0.7 + fuel * 0.8, 0.5 + fuel * 0.6] }}
        transition={{ repeat: Infinity, duration: 0.18 }}
      />
    )}
    <path d="M30 120 L10 165 L32 152 Z" fill="#8B5CF6" />
    <path d="M70 120 L90 165 L68 152 Z" fill="#8B5CF6" />
    <path d="M50 8 C72 40 74 100 70 155 H30 C26 100 28 40 50 8 Z" fill="url(#hull)" />
    <path d="M50 8 C60 22 66 36 68 50 H32 C34 36 40 22 50 8 Z" fill="#F43F5E" />
    <circle cx="50" cy="80" r="13" fill="#0B1030" stroke="#22D3EE" strokeWidth="4" />
    <circle cx="46" cy="76" r="4" fill="#A5F3FC" opacity="0.8" />
    <rect x="38" y="152" width="24" height="10" rx="2" fill="#4B5280" />
    <text x="50" y="128" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1A1033" fontFamily="Orbitron, sans-serif">
      RKT
    </text>
  </motion.svg>
);

const LaunchPanel = ({ systems, playerName, weekLabel, weekKey, endDate, onGo }: LaunchPanelProps) => {
  // Bonus systems (optional) add XP but are not needed to launch
  const core = systems.filter((s) => !s.optional);
  const done = core.filter((s) => s.progress >= s.goal).length;
  const fuel = core.length ? done / core.length : 0;
  const allDone = done === core.length;
  const next = core.find((s) => s.progress < s.goal) ?? systems.find((s) => s.progress < s.goal);
  const storageKey = `launched-${weekKey}`;
  const [launched, setLaunched] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    try {
      setLaunched(!!weekKey && localStorage.getItem(storageKey) === "1");
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, weekKey]);

  const launch = () => {
    setLaunching(true);
    setTimeout(() => {
      setLaunched(true);
      setLaunching(false);
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    }, 2300);
  };

  return (
    <div className="cockpit p-4 md:p-6 overflow-hidden">
      {launching && <Confetti count={90} />}

      {/* HUD bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="hud-label text-neon">Misión semanal · {weekLabel}</p>
          <h1 className="font-display text-2xl md:text-4xl font-black tracking-wider text-gold-gradient leading-tight">
            {allDone ? "¡Listos para despegar!" : `Preparando despegue, ${firstName(playerName)}`}
          </h1>
        </div>
        <div className="flex gap-2">
          {endDate && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-center">
              <p className="hud-label text-[9px] text-destructive">T-minus</p>
              <p className="font-display text-lg text-destructive leading-none">{timeLeft(endDate).label}</p>
            </div>
          )}
          <div className="rounded-xl border border-xp/40 bg-xp/10 px-3 py-1.5 text-center">
            <p className="hud-label text-[9px] text-xp">Sistemas</p>
            <p className="font-display text-lg text-xp leading-none">
              {done}/{core.length}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid lg:grid-cols-[1.35fr_1fr] gap-5">
        {/* Systems */}
        <div className="space-y-3">
          {systems.map((s, i) => {
            const ok = s.progress >= s.goal;
            const partial = !ok && s.progress > 0;
            const isNext = next?.id === s.id;
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ x: 4 }}
                whileTap={{ y: 3 }}
                onClick={() => onGo(s.to)}
                className={cn(
                  "system-card w-full rounded-2xl px-4 py-3 md:py-4 flex items-center gap-4 text-left",
                  ok ? "system-card-done" : isNext && "system-card-next",
                )}
              >
                <span className={cn("text-3xl md:text-4xl shrink-0", ok && "grayscale-0")}>{ok ? "✅" : s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("status-light shrink-0", ok ? "status-done" : partial ? "status-partial" : "status-pending")} />
                    <span className="font-display text-sm md:text-lg font-black tracking-wider uppercase">{s.title}</span>
                    {isNext && <span className="chip bg-primary text-primary-foreground text-[10px] px-2 py-0.5 ml-1">SIGUIENTE</span>}
                    {s.optional && !ok && <span className="chip bg-muted text-muted-foreground text-[10px] px-2 py-0.5 ml-1">BONUS</span>}
                  </div>
                  <p className="text-xs md:text-sm mt-0.5 text-muted-foreground">
                    {ok ? "Sistema en línea" : s.subtitle}
                  </p>
                  <XpBar value={s.progress / s.goal} className="h-2 mt-2" />
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("font-hud text-xs md:text-sm font-bold", ok ? "text-xp" : "text-primary")}>+{s.xp} XP</p>
                  <p className="font-hud text-[11px] opacity-70">
                    {Math.min(s.progress, s.goal)}/{s.goal}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 opacity-60 shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Launch pad */}
        <div className="relative rounded-2xl border border-border/50 bg-[radial-gradient(circle_at_50%_80%,hsl(var(--neon-violet)/0.25),transparent_60%)] min-h-[360px] flex flex-col items-center justify-end p-4 overflow-hidden">
          {/* fuel gauge */}
          <div className="absolute left-4 top-4 bottom-20 w-5 rounded-full bg-muted/60 overflow-hidden border border-border/60">
            <motion.div
              className="absolute bottom-0 inset-x-0 rounded-full bg-gradient-to-t from-destructive via-primary to-xp"
              initial={{ height: 0 }}
              animate={{ height: `${fuel * 100}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="absolute left-11 top-4 font-hud text-[10px] text-muted-foreground">COMBUSTIBLE</div>
          <div className="absolute left-11 top-8 font-display text-2xl text-foreground">{Math.round(fuel * 100)}%</div>

          {/* tower */}
          <div className="absolute right-10 bottom-14 w-3 h-48 bg-[repeating-linear-gradient(45deg,hsl(var(--muted))_0_6px,hsl(var(--border))_6px_12px)] rounded-sm" />

          <AnimatePresence mode="wait">
            {launched && !launching ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-6xl">🌌</span>
                <p className="font-display text-xl text-gold-gradient">¡Misión cumplida!</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">Despegaste esta semana. Ve a la presentación del viernes para ver resultados.</p>
              </motion.div>
            ) : (
              <motion.div key="rocket" className="relative mb-6">
                <RocketShip fuel={fuel} launching={launching} />
                {/* smoke */}
                {fuel > 0 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.span
                        key={i}
                        className="h-6 w-6 rounded-full bg-white/20 blur-sm"
                        animate={{ y: [0, -8, 0], opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.3, 0.8] }}
                        transition={{ repeat: Infinity, duration: 1.2 + i * 0.2, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full h-3 rounded bg-gradient-to-r from-border via-muted-foreground/40 to-border mb-3" />

          {allDone && !launched ? (
            <GameButton variant="gold" size="xl" className="w-full animate-pulse" onClick={launch} disabled={launching}>
              🚀 ¡Despegar!
            </GameButton>
          ) : !launched ? (
            <GameButton variant="cyan" size="lg" className="w-full" onClick={() => next && onGo(next.to)}>
              {next ? `${next.emoji} Cargar ${next.title}` : "Cargando…"}
            </GameButton>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LaunchPanel;
