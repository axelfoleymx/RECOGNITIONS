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
