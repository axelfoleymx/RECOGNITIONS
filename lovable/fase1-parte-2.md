# FASE 1 · PARTE 2 DE 4 — Rocketing Recognitions

Crea o reemplaza cada archivo EXACTAMENTE con el contenido indicado (completo, sin resumir ni rediseñar). No toques otros archivos ni el login, y no borres datos.

### Archivo: `src/components/game/HomeHud.tsx`

~~~tsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENTS,
  AwardCategory,
  firstName,
  GamePerson,
  levelFor,
  LaunchSystem,
  Milestone,
  milestoneKind,
  PlayerStats,
  xpFor,
} from "@/lib/gamification";
import LaunchPanel from "./LaunchPanel";
import GameButton from "./GameButton";
import Trophy from "./Trophy";
import PlayerAvatar from "./PlayerAvatar";
import XpBar from "./XpBar";
import ClimateMeter from "./ClimateMeter";

export type TeamStats = {
  participation: number; // 0..1
  coverage: number; // 0..1
  recognitions: number;
  awardVotes: number;
  milestones: number;
};

export interface HomeHudProps {
  playerName: string;
  myPerson: GamePerson | null;
  stats: PlayerStats;
  systems: LaunchSystem[];
  /** anonymous mood counts (1–5) for the team-climate index */
  moodPulse?: Record<number, number>;
  weekKey?: string;
  categories: AwardCategory[];
  voteTotals: Record<string, number>;
  myAwardVotes: number;
  votedRocketer: boolean;
  radar: GamePerson[];
  milestones: Milestone[];
  peopleById: Record<string, GamePerson>;
  team: TeamStats;
  isAdmin?: boolean;
  /** shown above everything (e.g. the upcoming birthday banner) */
  topSlot?: React.ReactNode;
  topGivers: { person: GamePerson; xp: number }[];
  weekLabel: string;
  endDate?: string;
}

const fade = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

const Section = ({ title, action, onAction, children, className, i = 0 }: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
  i?: number;
}) => (
  <motion.section {...fade(i)} className={cn("hud-panel p-5", className)}>
    <div className="flex items-center justify-between mb-4">
      <h2 className="hud-label text-foreground/80">{title}</h2>
      {action && (
        <button onClick={onAction} className="font-hud text-xs text-accent hover:text-primary flex items-center gap-0.5">
          {action} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    {children}
  </motion.section>
);

const HomeHud = (p: HomeHudProps) => {
  const navigate = useNavigate();
  const xp = xpFor(p.stats);
  const lvl = levelFor(xp);

  return (
    <div className="space-y-5">
      {p.topSlot}
      {p.isAdmin && (
        <div className="cockpit p-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div>
            <p className="hud-label text-neon">Control de misión · solo admin</p>
            <p className="text-sm text-muted-foreground">Proyecta los resultados de la semana en pantalla completa, con música.</p>
          </div>
          <GameButton variant="violet" size="lg" onClick={() => navigate("/admin?present=1")}>
            🎬 Iniciar presentación
          </GameButton>
        </div>
      )}
      <LaunchPanel
        systems={p.systems}
        playerName={p.playerName}
        weekLabel={p.weekLabel}
        weekKey={p.weekKey}
        endDate={p.endDate}
        onGo={(to) => navigate(to)}
      />

      <Section title="🌡️ Clima del equipo esta semana" action="Tu autoevaluación" onAction={() => navigate("/checkin")} i={1}>
        <ClimateMeter counts={p.moodPulse ?? {}} />
      </Section>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Player card */}
        <Section title="Tu perfil de jugador" i={1}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <PlayerAvatar name={p.playerName} photoUrl={p.myPerson?.photo_url} size={72} ring="violet" />
              <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--gold-deep))] text-primary-foreground font-display text-xs flex items-center justify-center border-2 border-background">
                {lvl.index}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg text-foreground truncate">
                {lvl.emoji} {lvl.title}
              </p>
              <p className="font-hud text-xs text-muted-foreground">
                {xp} XP {lvl.next ? `· ${lvl.next.min - xp} para ${lvl.next.title}` : "· nivel máximo"}
              </p>
              <XpBar value={lvl.progress} className="mt-2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[
              { v: p.stats.recognitionsGiven, l: "Dados" },
              { v: p.stats.recognitionsReceived, l: "Recibidos" },
              { v: p.stats.awardsWon, l: "Premios" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-muted/40 py-2">
                <p className="font-display text-lg text-foreground">{s.v}</p>
                <p className="hud-label text-[9px]">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="hud-label mt-4 mb-2">Logros</p>
          <div className="grid grid-cols-8 gap-1.5">
            {ACHIEVEMENTS.map((a) => {
              const on = a.check(p.stats);
              return (
                <div
                  key={a.id}
                  title={`${a.title} — ${a.description}${on ? "" : " (bloqueado)"}`}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-base border",
                    on ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_hsl(var(--star-gold)/0.3)]" : "border-border/50 bg-muted/30 grayscale opacity-40",
                  )}
                >
                  {on ? a.emoji : <Lock className="h-3 w-3" />}
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate("/my-recognitions")} className="mt-4 w-full font-hud text-xs text-accent hover:text-primary flex items-center justify-center gap-1">
            🎓 Ver mi diploma <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </Section>

      {/* Awards in play */}
      <Section title="Premios en juego esta semana" action="Votar en Recognitions" onAction={() => navigate("/recognize")} i={3} className="lg:col-span-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {p.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate("/awards")}
              className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col items-center text-center hover:border-primary/60 transition-colors"
            >
              <Trophy size={52} emoji={c.emoji} />
              <p className="font-display text-[11px] font-bold text-gold-gradient mt-1 leading-tight">{c.name}</p>
              <p className="font-hud text-[10px] text-muted-foreground mt-1">{p.voteTotals[c.id] || 0} votos</p>
            </button>
          ))}
          <button
            onClick={() => navigate("/vote")}
            className="rounded-xl border border-neon-violet/50 bg-neon-violet/10 p-3 flex flex-col items-center text-center hover:shadow-[0_0_24px_hsl(var(--neon-violet)/0.4)] transition-shadow"
          >
            <Trophy size={52} emoji="🚀" variant="mega" />
            <p className="font-display text-[11px] font-bold text-foreground mt-1 leading-tight">Rocketer</p>
            <p className="font-hud text-[10px] mt-1 text-neon-violet">{p.votedRocketer ? "✓ Votaste" : "Pendiente"}</p>
          </button>
        </div>
      </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Radar */}
        <Section title={`📡 Radar · ${p.radar.length} sin reconocimiento`} i={4}>
          {p.radar.length === 0 ? (
            <p className="text-sm text-muted-foreground">¡Toda la tripulación ya fue reconocida esta semana! 🙌</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Nadie les ha dado kudos esta semana. Reconocer a uno completa una misión.
              </p>
              <div className="flex flex-wrap gap-3">
                {p.radar.slice(0, 12).map((person) => (
                  <button
                    key={person.id}
                    onClick={() => navigate(`/recognize?to=${person.id}`)}
                    className="flex flex-col items-center gap-1 w-14 group"
                  >
                    <PlayerAvatar name={person.name} photoUrl={person.photo_url} size={46} ring="cyan" className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">{firstName(person.name)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Milestones */}
        <Section title="🏁 Hitos de la semana" action="Registrar" onAction={() => navigate("/milestones")} i={5}>
          {p.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin hitos aún. ¿Qué lograron como equipo esta semana?</p>
          ) : (
            <ul className="space-y-3">
              {p.milestones.slice(0, 4).map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="text-xl">{milestoneKind(m.kind).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{m.title}</p>
                    <div className="flex -space-x-2 mt-1.5">
                      {m.participants.slice(0, 6).map((pid) =>
                        p.peopleById[pid] ? (
                          <PlayerAvatar key={pid} name={p.peopleById[pid].name} photoUrl={p.peopleById[pid].photo_url} size={22} ring="none" className="border-2 border-background" />
                        ) : null,
                      )}
                    </div>
                  </div>
                  <span className="text-xs">{"🚀".repeat(m.impact)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Team + leaderboard */}
        <Section title="📊 Pulso del equipo" i={6}>
          <div className="space-y-3">
            {[
              { l: "Participación", v: p.team.participation, hint: "dieron kudos o votaron" },
              { l: "Cobertura", v: p.team.coverage, hint: "recibieron algún reconocimiento" },
            ].map((s) => (
              <div key={s.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {s.l} <span className="opacity-60">· {s.hint}</span>
                  </span>
                  <span className="font-hud text-foreground">{Math.round(s.v * 100)}%</span>
                </div>
                <XpBar value={s.v} className="h-2" />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              {[
                { v: p.team.recognitions, l: "Kudos" },
                { v: p.team.awardVotes, l: "Votos" },
                { v: p.team.milestones, l: "Hitos" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg bg-muted/40 py-2">
                  <p className="font-display text-lg">{s.v}</p>
                  <p className="hud-label text-[9px]">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="hud-label mt-5 mb-2">Top embajadores (XP dado)</p>
          <ol className="space-y-2">
            {p.topGivers.slice(0, 5).map((g, i) => (
              <li key={g.person.id} className="flex items-center gap-2">
                <span className={cn("font-display text-sm w-5 text-center", i === 0 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                <PlayerAvatar name={g.person.name} photoUrl={g.person.photo_url} size={26} ring={i === 0 ? "gold" : "none"} />
                <span className="text-sm flex-1 truncate">{g.person.name}</span>
                <span className="font-hud text-xs text-xp">{g.xp} XP</span>
              </li>
            ))}
            {p.topGivers.length === 0 && <p className="text-xs text-muted-foreground">Sé el primero en aparecer aquí.</p>}
          </ol>
        </Section>
      </div>
    </div>
  );
};

export default HomeHud;
~~~

### Archivo: `src/components/game/LaunchPanel.tsx`

~~~tsx
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
~~~

### Archivo: `src/components/game/OnboardingTour.tsx`

~~~tsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import GameButton from "./GameButton";

const SEEN_KEY = "rocketing-tour-v2";

const SLIDES = [
  {
    emoji: "🚀",
    title: "Cada semana es una misión",
    body: "Completa 3 sistemas para despegar: Recognitions y premios, Rocketer y Autoevaluación. Hitos es un bonus. Cada uno te da XP para subir de nivel.",
  },
  {
    emoji: "🏅",
    title: "Una sola encuesta, varios premios",
    body: "Cada pregunta es un premio de la semana. Toca o desliza a quien se lo ganó y califica con 1 a 3 🚀. Quien junte más 🚀 gana ese premio. Al final puedes dar medallas libres a quien quieras, con tu nombre o en anónimo.",
  },
  {
    emoji: "🪞",
    title: "¿Cómo te sentiste?",
    body: "La autoevaluación es privada: solo RH la ve. El equipo solo ve el clima general con caritas, para echarnos la mano cuando alguien tuvo una semana pesada.",
  },
  {
    emoji: "🎬",
    title: "El viernes se revela todo",
    body: "En la presentación salen los hitos, los ganadores de cada premio, las medallas y el Rocketer. Pon tu video de YouTube en la Nave: suena si ganas el Rocketer.",
  },
];

/** First-visit walkthrough; reopen it with the "?" button in the header. */
const OnboardingTour = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    onOpenChange(false);
  };

  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="bg-card border-primary/40 max-w-md text-center">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-3 py-2">
            <div className="text-6xl">{s.emoji}</div>
            <DialogTitle className="font-display text-xl text-gold-gradient">{s.title}</DialogTitle>
            <DialogDescription className="text-sm text-foreground/85 leading-relaxed">{s.body}</DialogDescription>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {SLIDES.map((_, j) => (
            <span key={j} className={cn("h-1.5 rounded-full transition-all", j === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
          ))}
        </div>
        <div className="flex gap-2">
          <GameButton variant="ghost" size="md" className="flex-1" onClick={close}>
            Saltar
          </GameButton>
          <GameButton variant="gold" size="md" className="flex-1" onClick={() => (last ? close() : setI(i + 1))}>
            {last ? "¡A despegar!" : "Siguiente"}
          </GameButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const tourSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
};

export default OnboardingTour;
~~~

### Archivo: `src/components/game/RecognitionSurvey.tsx`

~~~tsx
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, MessageSquarePlus, Plus, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { GamePerson, pillarOf, RATING_LABELS, RECOGNITION_PILLARS, shortNames, SurveyQuestion, XP } from "@/lib/gamification";
import Medal from "./Medal";
import PlayerAvatar from "./PlayerAvatar";
import GameButton from "./GameButton";
import { DraggablePerson } from "./DragPeople";

export type SurveyAnswer = { questionId: string; personId: string; rating: number; comment: string };
export type SurveyExtra = { personId: string; pillar: string; message: string };
export type SurveySubmission = { answers: SurveyAnswer[]; extras: SurveyExtra[]; anonymous: boolean };

interface RecognitionSurveyProps {
  people: GamePerson[];
  myUserId: string | null;
  /** one question per award of the week */
  questions: SurveyQuestion[];
  /** people nobody has recognized this week */
  radarIds: Set<string>;
  /** people added this session (shown with a "Nuevo" tag) */
  newPersonIds?: Set<string>;
  /** a person just added: selected in the current question */
  autoSelectId?: string | null;
  /** survey already sent this week → open on the free medals */
  alreadyDone?: boolean;
  initialPersonId?: string | null;
  onAddPerson?: () => void;
  onSubmit: (s: SurveySubmission) => Promise<void>;
  onFinish?: () => void;
}

type Pick = { rating: number; comment: string; showComment?: boolean };
const MEDAL_ZONE = "extra-medal";

const RocketRating = ({ value, onChange, size = "md" }: { value: number; onChange: (v: number) => void; size?: "md" | "lg" }) => (
  <div className="flex gap-1">
    {[1, 2, 3].map((n) => (
      <motion.button
        key={n}
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          onChange(n);
        }}
        aria-label={`${n} ${n === 1 ? "cohete" : "cohetes"}: ${RATING_LABELS[n]}`}
        className={cn(
          "rounded-lg border flex items-center justify-center transition-all",
          size === "lg" ? "h-11 px-3 text-base" : "h-9 w-9 text-base",
          n <= value ? "border-primary/70 bg-primary/20 shadow-[0_0_12px_hsl(var(--star-gold)/0.4)]" : "border-border bg-muted/40 grayscale opacity-50",
        )}
      >
        {size === "lg" ? "🚀".repeat(n) : "🚀"}
      </motion.button>
    ))}
  </div>
);

const RecognitionSurvey = ({
  people,
  myUserId,
  questions,
  radarIds,
  newPersonIds,
  autoSelectId,
  alreadyDone,
  initialPersonId,
  onAddPerson,
  onSubmit,
  onFinish,
}: RecognitionSurveyProps) => {
  const EXTRA_STEP = questions.length;
  const REVIEW_STEP = questions.length + 1;
  const [step, setStep] = useState(alreadyDone || initialPersonId ? EXTRA_STEP : 0);
  const [answers, setAnswers] = useState<Record<string, Record<string, Pick>>>({});
  const [extras, setExtras] = useState<SurveyExtra[]>([]);
  const [extraPerson, setExtraPerson] = useState<string | null>(initialPersonId ?? null);
  const [extraPillar, setExtraPillar] = useState("");
  const [extraMessage, setExtraMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);

  const crew = useMemo(
    () =>
      people
        .filter((p) => !(myUserId && p.user_id === myUserId))
        .sort(
          (a, b) =>
            Number(!!newPersonIds?.has(b.id)) - Number(!!newPersonIds?.has(a.id)) ||
            Number(radarIds.has(b.id)) - Number(radarIds.has(a.id)) ||
            a.name.localeCompare(b.name),
        ),
    [people, radarIds, myUserId, newPersonIds],
  );
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const labels = useMemo(() => shortNames(crew), [crew]);
  const radarCount = crew.filter((p) => radarIds.has(p.id)).length;
  // At the start of the week everybody is "missing": highlighting all of them means nothing.
  const radarMeaningful = radarCount > 0 && radarCount <= Math.ceil(crew.length / 2);

  const q = questions[step];
  const current = (q && answers[q.id]) || {};
  const selectedIds = Object.keys(current);
  const ratedAnywhere = useMemo(() => new Set(Object.values(answers).flatMap((a) => Object.keys(a))), [answers]);

  const setPick = (personId: string, pick: Pick | null) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      if (pick === null) delete qa[personId];
      else qa[personId] = pick;
      return { ...all, [q.id]: qa };
    });
  };

  // A person added from "+ Agregar integrante" lands selected in the current question
  useEffect(() => {
    if (!autoSelectId) return;
    if (step < EXTRA_STEP) setPick(autoSelectId, { rating: 2, comment: "" });
    else setExtraPerson(autoSelectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectId]);

  const toggle = (personId: string) => (current[personId] ? setPick(personId, null) : setPick(personId, { rating: 2, comment: "" }));

  const bulkRate = (rating: number) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      Object.keys(qa).forEach((id) => (qa[id] = { ...qa[id], rating }));
      return { ...all, [q.id]: qa };
    });
  };

  const selectRadar = () => crew.filter((p) => radarIds.has(p.id) && !current[p.id]).forEach((p) => setPick(p.id, { rating: 2, comment: "" }));

  const onSwipe = (personId: string, info: PanInfo) => {
    if (info.offset.x > 70 && !current[personId]) setPick(personId, { rating: 2, comment: "" });
    if (info.offset.x < -70 && current[personId]) setPick(personId, null);
  };

  const flatAnswers: SurveyAnswer[] = Object.entries(answers).flatMap(([questionId, qa]) =>
    Object.entries(qa).map(([personId, p]) => ({ questionId, personId, rating: p.rating, comment: p.comment.trim() })),
  );
  const draftValid = !!extraPerson && !!extraPillar && extraMessage.trim().length >= 10;
  const allExtras = draftValid ? [...extras, { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() }] : extras;
  const canSubmit = flatAnswers.length > 0 || allExtras.length > 0;

  const addMedal = () => {
    if (!draftValid) return;
    setExtras((l) => [...l, { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() }]);
    setExtraPerson(null);
    setExtraPillar("");
    setExtraMessage("");
    setBurst((b) => b + 1);
  };

  const submit = async () => {
    setSending(true);
    try {
      await onSubmit({ answers: flatAnswers, extras: allExtras, anonymous });
      setDone(true);
      setBurst((b) => b + 1);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setExtras([]);
    setExtraPerson(null);
    setExtraPillar("");
    setExtraMessage("");
    setStep(EXTRA_STEP);
    setDone(false);
  };

  // ---------------------------------------------------------------- done
  if (done) {
    return (
      <div className="cockpit p-8 md:p-12 flex flex-col items-center text-center gap-4">
        <EmojiBurst triggerSignal={burst} count={30} />
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
          <Medal size={140} emoji="✓" active />
        </motion.div>
        <h2 className="font-display text-2xl md:text-3xl font-black text-gold-gradient">¡Recognitions enviados!</h2>
        <p className="text-muted-foreground max-w-md">
          {flatAnswers.length > 0 && `${flatAnswers.length} ${flatAnswers.length === 1 ? "voto" : "votos"} en los premios de la semana. `}
          {allExtras.length > 0 && `${allExtras.length} medalla${allExtras.length !== 1 ? "s" : ""} extra. `}
          Sistema de Recognitions en verde 🟢
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <GameButton variant="gold" onClick={onFinish}>
            🚀 Volver a la nave
          </GameButton>
          <GameButton variant="ghost" onClick={reset}>
            🏅 Dar más medallas
          </GameButton>
        </div>
      </div>
    );
  }

  const steps = [
    ...questions.map((x) => ({ emoji: x.emoji, label: x.short })),
    { emoji: "🏅", label: "Medallas" },
    { emoji: "✅", label: "Enviar" },
  ];

  const AnonToggle = (
    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 pl-3 pr-2 py-1.5 cursor-pointer select-none">
      <span className="text-sm">{anonymous ? "🕶️ Anónimo" : "🙋 Con mi nombre"}</span>
      <Switch checked={anonymous} onCheckedChange={setAnonymous} aria-label="Enviar como anónimo" />
    </label>
  );

  return (
    <div className="space-y-4">
      <EmojiBurst triggerSignal={burst} />

      {/* Steps + anonymous mode, always on top so the question is in view right away */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-stretch gap-1.5 flex-1 overflow-x-auto pb-1" role="tablist" aria-label="Pasos de la encuesta">
          {steps.map((s, i) => {
            const answered = i < EXTRA_STEP && Object.keys(answers[questions[i]?.id] || {}).length > 0;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={i === step}
                aria-label={`Paso ${i + 1}: ${s.label}${answered ? " (contestado)" : ""}`}
                onClick={() => setStep(i)}
                className={cn(
                  "min-w-[56px] flex-1 rounded-lg border px-1 py-1.5 flex flex-col items-center justify-center transition-all",
                  i === step ? "border-primary bg-primary/20 shadow-[0_0_16px_hsl(var(--star-gold)/0.4)]" : answered ? "border-xp/50 bg-xp/10" : "border-border/60 bg-muted/30 opacity-70",
                )}
              >
                <span className="text-base leading-none">{answered && i !== step ? "✓" : s.emoji}</span>
                <span className="font-hud text-[10px] leading-tight mt-0.5 truncate max-w-full">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="shrink-0">{AnonToggle}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
          {/* ------------------------------------------------ award questions */}
          {q && (
            <div className="cockpit p-4 md:p-6">
              <p className="hud-label text-neon">
                Premio {step + 1} de {questions.length} ·{" "}
                <span style={{ color: `hsl(${pillarOf(q.pillar).hue})` }}>{pillarOf(q.pillar).label}</span>
              </p>
              <h2 className="font-display text-xl md:text-3xl font-black text-foreground mt-1 text-balance">
                {q.emoji} {q.question}
              </h2>
              {q.description && <p className="text-sm text-foreground/80 mt-1">{q.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Toca o desliza → a quien se lo ganó y califica: 🚀 bien · 🚀🚀 muy bien · 🚀🚀🚀 épico. Puedes elegir a varios.
              </p>

              <div className="flex flex-wrap gap-2 mt-3 mb-3">
                {onAddPerson && (
                  <button onClick={onAddPerson} className="chip border border-primary/50 text-primary hover:bg-primary/10 px-3 py-2">
                    <UserPlus className="h-3.5 w-3.5" /> Agregar integrante
                  </button>
                )}
                {radarMeaningful && (
                  <button onClick={selectRadar} className="chip border border-accent/50 text-accent hover:bg-accent/10 px-3 py-2">
                    📡 Elegir a quienes aún no tienen recognition ({radarCount})
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: {} }))} className="chip border border-border text-muted-foreground px-3 py-2">
                    Limpiar
                  </button>
                )}
              </div>

              <AnimatePresence>
                {selectedIds.length >= 2 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sticky top-16 z-20 mb-3">
                    <div className="rounded-xl border border-primary/50 bg-background/90 backdrop-blur px-3 py-2 flex flex-wrap items-center gap-3">
                      <span className="font-hud text-sm">
                        Calificar a los <strong className="text-primary">{selectedIds.length}</strong> seleccionados:
                      </span>
                      <RocketRating size="lg" value={0} onChange={bulkRate} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {crew.map((p) => {
                  const pick = current[p.id];
                  const radar = radarMeaningful && radarIds.has(p.id) && !ratedAnywhere.has(p.id);
                  const isNew = !!newPersonIds?.has(p.id);
                  return (
                    <div key={p.id} className="relative rounded-xl overflow-hidden">
                      <div aria-hidden className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-xp/40 via-xp/10 to-destructive/30">
                        <span className="font-hud text-xs font-bold text-xp">✓ ELEGIR →</span>
                        <span className="font-hud text-xs font-bold text-destructive">← QUITAR</span>
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.5}
                        onDragEnd={(_, info) => onSwipe(p.id, info)}
                        onClick={() => toggle(p.id)}
                        role="checkbox"
                        aria-checked={!!pick}
                        aria-label={`${p.name}${pick ? `, ${RATING_LABELS[pick.rating]}` : ""}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggle(p.id);
                          }
                        }}
                        className={cn(
                          "relative flex flex-wrap items-center gap-3 px-3 py-2.5 cursor-pointer border rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          pick ? "bg-[hsl(256_40%_14%)] border-primary/60" : radar ? "bg-[hsl(256_40%_10%)] border-accent/40" : "bg-[hsl(256_40%_9%)] border-border/50",
                        )}
                        style={{ touchAction: "pan-y" }}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0",
                            pick ? "border-primary bg-primary text-primary-foreground" : "border-primary/60",
                          )}
                        >
                          {pick && <Check className="h-4 w-4" />}
                        </span>
                        <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={44} ring={pick ? "gold" : radar ? "cyan" : "none"} />
                        <div className="flex-1 min-w-[120px]">
                          <p className="font-semibold leading-tight">
                            {p.name}
                            {isNew && <span className="chip bg-primary/20 text-primary text-[10px] px-2 py-0 ml-2 align-middle">Nuevo</span>}
                          </p>
                          {pick ? (
                            <p className="font-hud text-[11px] text-primary">{RATING_LABELS[pick.rating]}</p>
                          ) : (
                            radar && <p className="text-[11px] text-accent">📡 Aún sin recognition esta semana</p>
                          )}
                        </div>
                        {pick && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <RocketRating value={pick.rating} onChange={(r) => setPick(p.id, { ...pick, rating: r })} />
                            <button
                              onClick={() => setPick(p.id, { ...pick, showComment: !pick.showComment })}
                              className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", pick.comment ? "border-accent text-accent" : "border-border text-muted-foreground")}
                              aria-label={`Agregar comentario para ${p.name}`}
                            >
                              <MessageSquarePlus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {pick?.showComment && (
                          <div className="basis-full" onClick={(e) => e.stopPropagation()}>
                            <Input
                              autoFocus
                              value={pick.comment}
                              onChange={(e) => setPick(p.id, { ...pick, comment: e.target.value })}
                              placeholder={`¿Qué hizo ${labels[p.id] || p.name}? (opcional)`}
                              maxLength={200}
                              className="bg-muted/40 h-10"
                            />
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------ free medals (unlimited) */}
          {step === EXTRA_STEP && (
            <div className="space-y-4">
              <div className="cockpit p-4 relative z-30 select-none">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="hud-label text-foreground/80">Medallas libres · reconoce por lo que tú quieras</span>
                  <span className="text-xs text-muted-foreground">Arrastra una foto a la medalla o tócala</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
                  {crew.map((p) => (
                    <DraggablePerson
                      key={p.id}
                      person={p}
                      label={labels[p.id]}
                      size={44}
                      selected={extraPerson === p.id}
                      state={{ done: extras.some((x) => x.personId === p.id) || ratedAnywhere.has(p.id), badge: newPersonIds?.has(p.id) ? "Nuevo" : undefined }}
                      onHover={setHover}
                      onDrop={(pid, zone) => zone === MEDAL_ZONE && setExtraPerson(pid)}
                      onSelect={(pid) => setExtraPerson(pid)}
                    />
                  ))}
                  {onAddPerson && (
                    <button onClick={onAddPerson} className="flex flex-col items-center gap-1 w-[76px]" aria-label="Agregar integrante">
                      <span className="h-11 w-11 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center text-primary">
                        <Plus className="h-5 w-5" />
                      </span>
                      <span className="text-[11px] text-primary">Agregar</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
                <div
                  data-dropzone={MEDAL_ZONE}
                  className={cn(
                    "cockpit p-6 flex flex-col items-center justify-center min-h-[300px] transition-shadow",
                    hover === MEDAL_ZONE && "shadow-[0_0_0_2px_hsl(var(--star-gold)/0.7),0_0_50px_hsl(var(--star-gold)/0.4)]",
                  )}
                >
                  <div className="relative">
                    <Medal size={120} active={hover === MEDAL_ZONE || !!extraPerson} emoji={extraPerson ? "" : "★"} />
                    <AnimatePresence>
                      {extraPerson && byId[extraPerson] && (
                        <motion.div
                          key={extraPerson}
                          initial={{ scale: 0, y: -60 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 14 }}
                          className="absolute left-1/2 -translate-x-1/2"
                          style={{ top: 120 * 1.4 * 0.68 - 32 }}
                        >
                          <PlayerAvatar name={byId[extraPerson].name} photoUrl={byId[extraPerson].photo_url} size={64} ring="gold" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="font-display text-lg text-gold-gradient mt-2 text-center">
                    {extraPerson ? byId[extraPerson]?.name : "Elige a alguien"}
                  </p>
                  {extraPerson && (
                    <button onClick={() => setExtraPerson(null)} className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" /> Quitar
                    </button>
                  )}
                </div>
                <div className={cn("cockpit p-5 space-y-4", !extraPerson && "opacity-50 pointer-events-none")}>
                  <p className="text-sm text-muted-foreground">
                    ¿Algo que no cabe en los premios? Dale una medalla con tu propio mensaje. Puedes dar todas las que quieras.{" "}
                    <span className="text-xp">+{XP.giveRecognition} XP c/u</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RECOGNITION_PILLARS.map((id) => {
                      const pm = pillarOf(id);
                      const on = extraPillar === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setExtraPillar(id)}
                          className={cn("rounded-xl border px-3 py-2 text-left text-xs font-hud font-semibold transition-all", on ? "" : "border-border/60 bg-muted/30")}
                          style={on ? { borderColor: `hsl(${pm.hue})`, background: `hsl(${pm.hue} / 0.15)`, color: `hsl(${pm.hue})` } : undefined}
                        >
                          <span className="text-lg mr-1">{pm.emoji}</span> {pm.label}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    value={extraMessage}
                    onChange={(e) => setExtraMessage(e.target.value)}
                    placeholder="Sé concreto: qué hizo, para qué cliente, qué resultado…"
                    maxLength={400}
                    className="min-h-[100px] bg-muted/40"
                  />
                  <GameButton variant="cyan" size="md" className="w-full" disabled={!draftValid} onClick={addMedal}>
                    <Plus className="h-4 w-4" /> Agregar esta medalla
                  </GameButton>
                </div>
              </div>

              {extras.length > 0 && (
                <div className="cockpit p-4">
                  <p className="hud-label mb-2">Medallas listas para enviar ({extras.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {extras.map((x, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-0.5 pr-1.5 py-0.5">
                        <PlayerAvatar name={byId[x.personId]?.name || "?"} photoUrl={byId[x.personId]?.photo_url} size={22} ring="none" />
                        <span className="text-xs">{labels[x.personId] || byId[x.personId]?.name}</span>
                        <span className="text-xs">{pillarOf(x.pillar).emoji}</span>
                        <button onClick={() => setExtras((l) => l.filter((_, j) => j !== i))} aria-label="Quitar medalla" className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------ review */}
          {step === REVIEW_STEP && (
            <div className="cockpit p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl md:text-2xl font-black text-gold-gradient">Revisión antes de despegar</h2>
                {AnonToggle}
              </div>
              {questions.map((qq, i) => {
                const qa = answers[qq.id] || {};
                const ids = Object.keys(qa);
                return (
                  <button key={qq.id} onClick={() => setStep(i)} className="w-full text-left rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/50">
                    <p className="text-sm font-semibold">
                      {qq.emoji} {qq.question}
                    </p>
                    {ids.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">Nadie seleccionado</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ids.map((id) => (
                          <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-0.5 pr-2.5 py-0.5">
                            <PlayerAvatar name={byId[id]?.name || "?"} photoUrl={byId[id]?.photo_url} size={22} ring="none" />
                            <span className="text-xs">{labels[id] || byId[id]?.name}</span>
                            <span className="text-[10px]">{"🚀".repeat(qa[id].rating)}</span>
                            {qa[id].comment && <span className="text-[10px]">💬</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              <button onClick={() => setStep(EXTRA_STEP)} className="w-full text-left rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/50">
                <p className="text-sm font-semibold">🏅 Medallas libres</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {allExtras.length ? allExtras.map((x) => labels[x.personId] || byId[x.personId]?.name).join(", ") : "Sin medallas (opcional)"}
                </p>
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-20 lg:bottom-4 z-30 flex items-center gap-3">
        {step > 0 && (
          <GameButton variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} className="shrink-0" aria-label="Atrás">
            <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Atrás</span>
          </GameButton>
        )}
        {step < REVIEW_STEP ? (
          <GameButton variant={step < EXTRA_STEP && selectedIds.length === 0 ? "ghost" : "cyan"} size="lg" className="flex-1" onClick={() => setStep((s) => s + 1)}>
            {step < EXTRA_STEP
              ? selectedIds.length === 0
                ? "Nadie esta vez"
                : `Siguiente · ${selectedIds.length} elegido${selectedIds.length !== 1 ? "s" : ""}`
              : "Revisar y enviar"}
            <ChevronRight className="h-5 w-5" />
          </GameButton>
        ) : (
          <GameButton variant="gold" size="lg" className="flex-1" onClick={submit} disabled={!canSubmit || sending}>
            {sending ? "Lanzando…" : (
              <>
                <Check className="h-5 w-5" /> Enviar · +{XP.completeSurvey} XP
              </>
            )}
          </GameButton>
        )}
      </div>
    </div>
  );
};

export default RecognitionSurvey;
~~~

