# PARTE 3 DE 6 — Rocketing Recognitions 2.0

Ejecuta los pasos de este documento en orden. Copia cada archivo EXACTAMENTE (contenido completo).

Paso 5 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Cabina y video de victoria

### Archivo: `src/components/game/GameShell.tsx`

~~~tsx
import { ReactNode, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Award, Flag, Gauge, Home, LogOut, Medal, Rocket, Shield, Trophy } from "lucide-react";
import StarField from "@/components/StarField";
import VoteReminderBanner from "@/components/VoteReminderBanner";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerStats } from "@/hooks/useGame";
import { levelFor, xpFor } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Nave", short: "Nave", icon: Home, mobile: true },
  { to: "/awards", label: "Premios", short: "Premios", icon: Trophy, mobile: true },
  { to: "/recognize", label: "Recognitions", short: "Recog.", icon: Medal, mobile: true },
  { to: "/vote", label: "Rocketer", short: "Rocketer", icon: Rocket, mobile: true },
  { to: "/milestones", label: "Hitos", short: "Hitos", icon: Flag, mobile: true },
  { to: "/checkin", label: "Autoevaluación", short: "Yo", icon: Gauge, mobile: true },
  { to: "/my-recognitions", label: "Diploma", short: "Diploma", icon: Award, mobile: false },
];

interface GameShellProps {
  children: ReactNode;
  /** player chip in the header; the shell can also be rendered without auth (demo) */
  player?: { name: string; xp: number } | null;
  hideReminder?: boolean;
}

const PlayerChip = ({ name, xp }: { name: string; xp: number }) => {
  const lvl = levelFor(xp);
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 pl-1.5 pr-3 py-1">
      <span className="h-7 w-7 rounded-full bg-gradient-to-br from-neon-violet to-neon-magenta flex items-center justify-center text-sm">
        {lvl.emoji}
      </span>
      <div className="leading-tight">
        <p className="text-xs font-semibold text-foreground max-w-[120px] truncate">{name.split(" ")[0]}</p>
        <p className="font-hud text-[10px] text-xp">
          LV {lvl.index} · {xp} XP
        </p>
      </div>
    </div>
  );
};

const AuthPlayerChip = () => {
  const { profileName } = useAuth();
  const { data: stats } = usePlayerStats();
  if (!profileName) return null;
  return <PlayerChip name={profileName} xp={stats ? xpFor(stats) : 0} />;
};

const GameShell = ({ children, player, hideReminder }: GameShellProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Each screen opens at the top (the router keeps the previous scroll otherwise)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen space-gradient relative overflow-x-clip">
      <StarField />
      <div className="grid-floor" />
      <div className="relative z-10 pb-24 lg:pb-10">
        {!hideReminder && user && <VoteReminderBanner />}

        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 h-14">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--gold-deep))] flex items-center justify-center shadow-[0_0_16px_hsl(var(--star-gold)/0.5)]">
                <Rocket className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-display text-xs tracking-[0.2em] text-foreground hidden lg:inline">
                ROCKETING<span className="text-primary">//</span>ARENA
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "font-hud text-[13px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--star-gold)/0.4)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )
                  }
                >
                  <n.icon className="h-4 w-4 hidden xl:block" />
                  {n.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 ml-auto lg:ml-0">
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-accent hover:bg-muted/50"
                  aria-label="Admin"
                >
                  <Shield className="h-4 w-4" />
                </button>
              )}
              {player ? <PlayerChip {...player} /> : user ? <AuthPlayerChip /> : null}
              {user && (
                <button
                  onClick={signOut}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/50"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-6">{children}</main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="grid grid-cols-6">
          {NAV.filter((n) => n.mobile).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2 font-hud text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <n.icon className="h-5 w-5" />
              {n.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default GameShell;
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
  const done = systems.filter((s) => s.progress >= s.goal).length;
  const fuel = done / systems.length;
  const allDone = done === systems.length;
  const next = systems.find((s) => s.progress < s.goal);
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
              {done}/{systems.length}
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

### Archivo: `src/components/VictoryVideo.tsx`

~~~tsx
import { useEffect, useState } from "react";
import { ExternalLink, Trash2, Youtube } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import GameButton from "@/components/game/GameButton";
import { youtubeId } from "@/lib/gamification";

/** "Mi video de victoria": a YouTube link that plays in the presentation if you win Rocketer. */
const VictoryVideo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: person, isLoading } = useQuery({
    queryKey: ["my-person-video", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id, youtube_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => setUrl(person?.youtube_url ?? ""), [person?.youtube_url]);

  if (isLoading || !person) return null;

  const id = youtubeId(url);
  const savedId = youtubeId(person.youtube_url);

  const save = async (value: string | null) => {
    setSaving(true);
    const { error } = await supabase.from("people").update({ youtube_url: value }).eq("id", person.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["my-person-video"] });
    toast({ title: value ? "🎬 Video guardado" : "Video eliminado", description: value ? "Se reproducirá si ganas el Rocketer de la semana" : undefined });
  };

  return (
    <div className="cockpit p-4 md:p-5 mt-6 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
          <Youtube className="h-5 w-5 text-destructive" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold tracking-wider">Mi video de victoria</p>
          <p className="text-xs text-muted-foreground">Pega un link de YouTube: sonará en la presentación si ganas el Rocketer. Si ya tenías canción subida y no pones video, se sigue usando tu canción.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="bg-muted/40 h-11"
        />
        <GameButton size="md" variant="gold" disabled={!id || saving || url === person.youtube_url} onClick={() => save(url.trim())}>
          Guardar
        </GameButton>
      </div>
      {url && !id && <p className="text-xs text-destructive mt-1">Ese link no parece de YouTube.</p>}
      {savedId && (
        <div className="flex items-center gap-3 mt-3">
          <img src={`https://img.youtube.com/vi/${savedId}/mqdefault.jpg`} alt="Miniatura del video" className="h-14 rounded-lg border border-border" />
          <a href={person.youtube_url!} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
            Abrir en YouTube <ExternalLink className="h-3 w-3" />
          </a>
          <button onClick={() => save(null)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Quitar video">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VictoryVideo;
~~~

---

Paso 6 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Inicio (Nave)

`src/pages/Index.tsx` y `src/components/UpcomingBirthdays.tsx` reemplazan a los actuales. El aviso de próximo cumpleaños se conserva y ahora sale ARRIBA y en grande en la Nave. La sección de "Mi canción de victoria" se sustituye por "Mi video de victoria" (YouTube).

### Archivo: `src/components/UpcomingBirthdays.tsx`

~~~tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BirthdayGreetingOverlay from "@/components/BirthdayGreetingOverlay";
import { AnimatePresence } from "framer-motion";

type Person = {
  id: string;
  name: string;
  photo_url: string | null;
  birthday: string | null;
  song_url: string | null;
};

// Monday–Sunday window of the current week
const currentWeekRange = () => {
  const start = startOfToday();
  const dow = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - dow);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
};

const isBirthdayThisWeek = (birthday: string) => {
  const { start, end } = currentWeekRange();
  const [, mm, dd] = birthday.split("-").map(Number);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getMonth() + 1 === mm && d.getDate() === dd) return true;
  }
  return false;
};

const MS_DAY = 1000 * 60 * 60 * 24;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const nextOccurrence = (birthday: string) => {
  const [, mm, dd] = birthday.split("-").map(Number);
  const today = startOfToday();
  const year = today.getFullYear();
  let next = new Date(year, mm - 1, dd);
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < today.getTime()) {
    next = new Date(year + 1, mm - 1, dd);
    next.setHours(0, 0, 0, 0);
  }
  return next;
};

const lastOccurrence = (birthday: string) => {
  const [, mm, dd] = birthday.split("-").map(Number);
  const today = startOfToday();
  const year = today.getFullYear();
  let last = new Date(year, mm - 1, dd);
  last.setHours(0, 0, 0, 0);
  if (last.getTime() > today.getTime()) {
    last = new Date(year - 1, mm - 1, dd);
    last.setHours(0, 0, 0, 0);
  }
  return last;
};

const daysFromToday = (date: Date) =>
  Math.round((date.getTime() - startOfToday().getTime()) / MS_DAY);

const relativeFuture = (days: number) => {
  if (days === 0) return "¡hoy! 🎂";
  if (days === 1) return "mañana";
  return `en ${days} días`;
};

const relativePast = (days: number) => {
  if (days === 1) return "ayer";
  return `hace ${days} días`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Balloon = ({ delay, x, color }: { delay: number; x: string; color: string }) => (
  <motion.div
    className="absolute text-2xl pointer-events-none"
    style={{ left: x, bottom: 0 }}
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: -120, opacity: [0, 1, 1, 0] }}
    transition={{ duration: 4, delay, repeat: Infinity, repeatDelay: 2, ease: "easeOut" }}
  >
    {color}
  </motion.div>
);

/** `featured` = large banner at the top of the dashboard so nobody misses it. */
const UpcomingBirthdays = ({ featured = false }: { featured?: boolean }) => {
  const [greeting, setGreeting] = useState<Person | null>(null);
  const { data: people } = useQuery({
    queryKey: ["birthdays-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, photo_url, birthday, song_url")
        .eq("active", true)
        .eq("approved", true)
        .not("birthday", "is", null);
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  if (!people || people.length === 0) return null;

  const upcoming = people
    .map((p) => ({ person: p, date: nextOccurrence(p.birthday!), days: daysFromToday(nextOccurrence(p.birthday!)) }))
    .filter((x) => x.days <= 14)
    .sort((a, b) => a.days - b.days);

  const recent = people
    .map((p) => ({ person: p, date: lastOccurrence(p.birthday!), days: -daysFromToday(lastOccurrence(p.birthday!)) }))
    .filter((x) => x.days >= 1 && x.days <= 7)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0 && recent.length === 0) return null;

  const hero = upcoming[0];
  const others = upcoming.slice(1, 4);
  const lastRecent = recent[0];
  const isToday = hero?.days === 0;

  return (
    <div className={cn("w-full", featured ? "" : "max-w-3xl mt-8")}>
      <div className="flex items-center gap-2 mb-3">
        <Cake className="h-4 w-4 text-accent" />
        <h2 className={cn("font-display tracking-widest text-accent uppercase", featured ? "text-sm" : "text-xs")}>Cumpleaños</h2>
      </div>

      {hero && (
        <div className={cn("glass-card-glow relative overflow-hidden", featured ? "p-6 md:p-8 border-primary/50" : "p-6")}>
          {isToday && (
            <>
              <Balloon delay={0} x="10%" color="🎈" />
              <Balloon delay={0.8} x="30%" color="🎂" />
              <Balloon delay={1.6} x="60%" color="🎉" />
              <Balloon delay={2.4} x="85%" color="🎈" />
            </>
          )}
          <div className="flex items-center gap-5 relative">
            <motion.div
              animate={isToday ? { scale: [1, 1.05, 1] } : undefined}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Avatar className={cn("ring-2 ring-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.4)]", featured ? "h-24 w-24 md:h-32 md:w-32" : "h-20 w-20")}>
                <AvatarImage src={hero.person.photo_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-display">
                  {initials(hero.person.name)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {isToday ? "¡Hoy cumple años!" : "Próximo cumpleaños"}
              </p>
              <p className={cn("font-display truncate", featured ? "text-3xl md:text-5xl font-black text-gold-gradient leading-tight" : "text-xl text-foreground")}>{hero.person.name}</p>
              <p className={cn("text-accent mt-1", featured ? "text-base md:text-lg font-semibold" : "text-sm")}>
                {relativeFuture(hero.days)} · {format(hero.date, "d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>

          {hero && isBirthdayThisWeek(hero.person.birthday!) && (
            <button
              onClick={() => setGreeting(hero.person)}
              className="btn-space mt-5 w-full rounded-full px-6 py-2.5 text-sm font-display tracking-wider"
            >
              🎉 Volver a ver la felicitación
            </button>
          )}

          {others.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap gap-4">
              {others.map((o) => (
                <div key={o.person.id} className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 ring-1 ring-accent/30">
                    <AvatarImage src={o.person.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-secondary/40">
                      {initials(o.person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <p className="text-foreground truncate max-w-[120px]">{o.person.name}</p>
                    <p className="text-muted-foreground">{relativeFuture(o.days)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lastRecent && isBirthdayThisWeek(lastRecent.person.birthday!) && (
        <button
          onClick={() => setGreeting(lastRecent.person)}
          className="btn-space mt-3 w-full rounded-full px-6 py-2.5 text-sm font-display tracking-wider"
        >
          🎉 Volver a ver la felicitación de {lastRecent.person.name}
        </button>
      )}

      {lastRecent && (
        <div className="glass-card mt-3 px-4 py-3 flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-1 ring-accent/30">
            <AvatarImage src={lastRecent.person.photo_url ?? undefined} />
            <AvatarFallback className="text-xs bg-secondary/40">
              {initials(lastRecent.person.name)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            {relativePast(lastRecent.days)} celebramos a{" "}
            <span className="text-foreground font-medium">{lastRecent.person.name}</span> 🎉
          </p>
        </div>
      )}
      <AnimatePresence>
        {greeting && (
          <BirthdayGreetingOverlay
            person={{
              id: greeting.id,
              name: greeting.name,
              photo_url: greeting.photo_url,
              song_url: greeting.song_url,
              birthday: greeting.birthday!,
            }}
            onClose={() => setGreeting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpcomingBirthdays;
~~~

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
      <Section title="Premios en juego esta semana" action={`Votar (${p.myAwardVotes}/${p.categories.length})`} onAction={() => navigate("/awards")} i={3} className="lg:col-span-2">
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

### Archivo: `src/pages/Index.tsx`

~~~tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import {
  useMoodPulse,
  useMyCheckin,
  useMyPerson,
  usePeople,
  usePlayerStats,
  useWeekAwards,
  useWeekAwardVotes,
  useWeekMilestones,
  useWeekRecognitions,
} from "@/hooks/useGame";
import GameShell from "@/components/game/GameShell";
import HomeHud from "@/components/game/HomeHud";
import UpcomingBirthdays from "@/components/UpcomingBirthdays";
import VictoryVideo from "@/components/VictoryVideo";
import PeopleCarousel from "@/components/PeopleCarousel";
import { buildWeekSummary, EMPTY_STATS } from "@/lib/gamification";

const Index = () => {
  const { user, profileName, isAdmin } = useAuth();
  const { data: week } = useCurrentWeek();
  const { data: people = [] } = usePeople();
  const { data: me = null } = useMyPerson();
  const { data: stats = EMPTY_STATS } = usePlayerStats();
  const { data: categories = [] } = useWeekAwards(week?.id);
  const { data: awardVotes = [] } = useWeekAwardVotes(week?.id);
  const { data: recognitions = [] } = useWeekRecognitions(week?.id);
  const { data: milestones = [] } = useWeekMilestones(week?.id);
  const { data: myCheckin } = useMyCheckin(week?.id);
  const { data: moodPulse } = useMoodPulse(week?.id);

  const { data: rocketerVotes = [] } = useQuery({
    queryKey: ["week-pulse", "rocketer-voters", week?.id],
    enabled: !!week,
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("voter_user_id").eq("week_id", week!.id);
      return data || [];
    },
  });

  const summary = useMemo(
    () =>
      buildWeekSummary({
        userId: user?.id ?? null,
        people,
        recognitions,
        awardVotes,
        milestones,
        categoriesCount: categories.length,
        votedRocketer: rocketerVotes.some((v) => v.voter_user_id === user?.id),
        rocketerVoters: rocketerVotes.length,
        checkinDone: !!myCheckin,
        myPersonId: me?.id,
      }),
    [user?.id, people, recognitions, awardVotes, milestones, categories.length, rocketerVotes, me?.id, myCheckin],
  );

  const voteTotals = useMemo(() => {
    const t: Record<string, number> = {};
    awardVotes.forEach((v) => (t[v.category_id] = (t[v.category_id] || 0) + 1));
    return t;
  }, [awardVotes]);

  const weekLabel = week
    ? `${format(parseISO(week.start_date), "d MMM", { locale: es })} – ${format(parseISO(week.end_date), "d MMM yyyy", { locale: es })}`
    : "";

  return (
    <GameShell>
      <HomeHud
        playerName={profileName || me?.name || "Rocketer"}
        myPerson={me}
        stats={stats}
        systems={summary.systems}
        moodPulse={moodPulse}
        weekKey={week?.id}
        categories={categories}
        voteTotals={voteTotals}
        myAwardVotes={summary.myAwardVotes}
        votedRocketer={rocketerVotes.some((v) => v.voter_user_id === user?.id)}
        radar={summary.radar.filter((p) => p.user_id !== user?.id)}
        milestones={milestones}
        peopleById={summary.peopleById}
        team={summary.team}
        isAdmin={isAdmin}
        topSlot={<UpcomingBirthdays featured />}
        topGivers={summary.topGivers}
        weekLabel={weekLabel}
        endDate={week?.end_date}
      />
      <div className="flex flex-col items-center mt-10">
        <PeopleCarousel />
        <VictoryVideo />
      </div>
    </GameShell>
  );
};

export default Index;
~~~

---

Paso 7 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Premios

### Archivo: `src/components/game/AwardsArena.tsx`

~~~tsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import {
  AwardCategory,
  AwardVote,
  firstName,
  GamePerson,
  MAX_AWARDS_PER_NOMINEE,
  MAX_SELF_NOMINATIONS,
  pillarOf,
  RECOGNITION_PILLARS,
  SELF_WEIGHT,
  XP,
} from "@/lib/gamification";
import Trophy from "./Trophy";
import PlayerAvatar from "./PlayerAvatar";
import RocketPicker from "./RocketPicker";
import XpBar from "./XpBar";
import { PeopleTray } from "./DragPeople";
import GameButton from "./GameButton";

export type CastInput = { categoryId: string; personId: string; rockets: number; reason: string };
export type ProposeInput = { name: string; description: string; emoji: string; pillar: string };

const CUSTOM_EMOJIS = ["🏅", "🦸", "🧠", "🎯", "🔥", "💎", "🧲", "🛠️", "🎤", "📣", "🧪", "🐐"];

interface AwardsArenaProps {
  people: GamePerson[];
  categories: AwardCategory[];
  /** current user's votes this week */
  myVotes: AwardVote[];
  /** total voters per category (shown without revealing the leader) */
  voteTotals: Record<string, number>;
  myUserId: string | null;
  locked?: boolean;
  onCast: (v: CastInput) => Promise<void>;
  onClear: (categoryId: string) => Promise<void>;
  /** team can still add this week's single extra award */
  canPropose?: boolean;
  onPropose?: (a: ProposeInput) => Promise<void>;
}

const AwardsArena = ({ people, categories, myVotes, voteTotals, myUserId, locked, onCast, onClear, canPropose, onPropose }: AwardsArenaProps) => {
  const [proposing, setProposing] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pEmoji, setPEmoji] = useState(CUSTOM_EMOJIS[0]);
  const [pPillar, setPPillar] = useState<string>("actitud");
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ categoryId: string; personId: string } | null>(null);
  const [rockets, setRockets] = useState(2);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const voteByCat = useMemo(() => Object.fromEntries(myVotes.map((v) => [v.category_id, v])), [myVotes]);
  const usesByPerson = useMemo(() => {
    const m: Record<string, number> = {};
    myVotes.forEach((v) => (m[v.nominee_person_id] = (m[v.nominee_person_id] || 0) + 1));
    return m;
  }, [myVotes]);

  const isMe = (personId: string) => !!myUserId && peopleById[personId]?.user_id === myUserId;
  const selfUses = myVotes.filter((v) => isMe(v.nominee_person_id)).length;

  const canDrop = (personId: string, categoryId: string) => {
    const person = peopleById[personId];
    if (!person) return "Persona no encontrada";
    const current = voteByCat[categoryId];
    if (isMe(personId) && selfUses - (current && isMe(current.nominee_person_id) ? 1 : 0) >= MAX_SELF_NOMINATIONS)
      return `Solo ${MAX_SELF_NOMINATIONS} autonominación por semana (vale ½)`;
    const uses = (usesByPerson[personId] || 0) - (current?.nominee_person_id === personId ? 1 : 0);
    if (uses >= MAX_AWARDS_PER_NOMINEE) return `Ya le diste ${MAX_AWARDS_PER_NOMINEE} premios. ¡Reparte la gloria!`;
    return null;
  };

  const [warning, setWarning] = useState<string | null>(null);
  const handleDrop = (personId: string, categoryId: string) => {
    if (locked) return;
    if (!categories.some((c) => c.id === categoryId)) return;
    const problem = canDrop(personId, categoryId);
    if (problem) {
      setWarning(problem);
      setTimeout(() => setWarning(null), 2600);
      return;
    }
    const current = voteByCat[categoryId];
    setRockets(current?.nominee_person_id === personId ? current.rockets : 2);
    setReason(current?.nominee_person_id === personId ? current.reason : "");
    setPending({ categoryId, personId });
  };

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onCast({ ...pending, rockets, reason: reason.trim() });
      setPending(null);
      setBurst((b) => b + 1);
    } finally {
      setSaving(false);
    }
  };

  const done = categories.filter((c) => voteByCat[c.id]).length;
  const pendingCat = pending && categories.find((c) => c.id === pending.categoryId);
  const pendingPerson = pending && peopleById[pending.personId];

  return (
    <div className="space-y-6">
      <EmojiBurst triggerSignal={burst} />

      {/* progress */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="hud-label">Progreso de votación</span>
            <span className="font-hud text-sm text-foreground">
              {done}/{categories.length} · <span className="text-xp">+{done * XP.castAwardVote} XP</span>
            </span>
          </div>
          <XpBar value={categories.length ? done / categories.length : 0} />
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-xs">
          Máx. {MAX_AWARDS_PER_NOMINEE} premios por persona · puedes autonominarte en 1 (vale ½) · 1–3 🚀 según el impacto.
        </p>
      </div>

      {/* trophies */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {categories.map((c, i) => {
          const vote = voteByCat[c.id];
          const nominee = vote && peopleById[vote.nominee_person_id];
          const hovered = hoverZone === c.id;
          const pillar = pillarOf(c.pillar);
          return (
            <motion.div
              key={c.id}
              data-dropzone={c.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => {
                if (selected) {
                  handleDrop(selected, c.id);
                  setSelected(null);
                }
              }}
              className={cn(
                "relative rounded-2xl border p-3 md:p-4 flex flex-col items-center text-center transition-all bg-card/70 backdrop-blur-xl",
                hovered || (selected && !locked)
                  ? "border-primary shadow-[0_0_0_2px_hsl(var(--star-gold)/0.6),0_0_40px_hsl(var(--star-gold)/0.35)]"
                  : vote
                    ? "border-primary/40"
                    : "border-border/60",
                selected && "cursor-pointer",
              )}
            >
              <span
                className="chip mb-1"
                style={
                  c.is_custom
                    ? { background: "hsl(var(--neon-magenta) / 0.18)", color: "hsl(var(--neon-magenta))" }
                    : { background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }
                }
              >
                {c.is_custom ? "⭐ Premio de la tripulación" : `${pillar.emoji} ${pillar.label}`}
              </span>

              <div className="relative mt-1">
                <Trophy size={78} emoji={c.emoji} active={hovered} />
                <AnimatePresence>
                  {nominee && (
                    <motion.div
                      key={nominee.id}
                      initial={{ scale: 0, y: -40, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      className="absolute left-1/2 -translate-x-1/2 top-3"
                    >
                      <PlayerAvatar name={nominee.name} photoUrl={nominee.photo_url} size={50} ring="gold" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <h3 className="font-display text-[12px] md:text-sm font-bold text-gold-gradient mt-2 leading-tight">
                {c.name}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-3 min-h-[2.6em]">
                {c.description}
              </p>

              <div className="mt-3 w-full min-h-[44px] flex items-center justify-center">
                {nominee ? (
                  <div className="w-full flex items-center justify-between gap-1 rounded-lg bg-primary/10 px-2 py-1.5">
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{firstName(nominee.name)}</p>
                      <p className="text-[11px] leading-none">{"🚀".repeat(vote.rockets)}</p>
                    </div>
                    {!locked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClear(c.id);
                        }}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Quitar voto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-dashed border-border py-2 text-[11px] font-hud text-muted-foreground">
                    {locked ? "Votación cerrada" : "Suelta una foto aquí"}
                  </div>
                )}
              </div>
              <span className="absolute top-2 right-2 font-hud text-[10px] text-muted-foreground">
                {voteTotals[c.id] || 0} 🗳️
              </span>
            </motion.div>
          );
        })}
        {canPropose && !locked && onPropose && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={() => setProposing(true)}
            className="rounded-2xl border-2 border-dashed border-neon-magenta/60 bg-neon-magenta/5 p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[260px] hover:bg-neon-magenta/10 hover:shadow-[0_0_30px_hsl(var(--neon-magenta)/0.35)] transition-all"
          >
            <span className="text-5xl">➕</span>
            <span className="font-display text-sm font-bold text-neon-magenta">Proponer premio extra</span>
            <span className="text-[11px] text-muted-foreground">Solo 1 por semana para todo el equipo. ¡El primero que lo cree lo nombra!</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[70] chip bg-destructive text-destructive-foreground px-4 py-2 text-sm shadow-xl"
          >
            {warning}
          </motion.div>
        )}
      </AnimatePresence>

      {!locked && (
        <PeopleTray
          className="lg:sticky lg:bottom-4"
          people={people}
          selectedId={selected}
          onSelect={setSelected}
          onHover={setHoverZone}
          onDrop={handleDrop}
          stateFor={(p) => {
            if (myUserId && p.user_id === myUserId)
              return { badge: "Tú ½", hint: "Autonominación: 1 por semana, vale ½", disabled: selfUses >= MAX_SELF_NOMINATIONS };
            const uses = usesByPerson[p.id] || 0;
            if (uses >= MAX_AWARDS_PER_NOMINEE) return { badge: `${uses}/${MAX_AWARDS_PER_NOMINEE}`, hint: "Ya tiene 2 premios tuyos" };
            if (uses > 0) return { badge: `${uses}/${MAX_AWARDS_PER_NOMINEE}` };
            return undefined;
          }}
        />
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="bg-card border-primary/40 max-w-md">
          {pendingCat && pendingPerson && (
            <>
              <DialogHeader className="items-center text-center">
                <div className="relative">
                  <Trophy size={96} emoji={pendingCat.emoji} active />
                  <motion.div
                    initial={{ scale: 0, y: -30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="absolute left-1/2 -translate-x-1/2 top-4"
                  >
                    <PlayerAvatar name={pendingPerson.name} photoUrl={pendingPerson.photo_url} size={60} ring="gold" />
                  </motion.div>
                </div>
                <DialogTitle className="font-display text-gold-gradient text-lg">{pendingCat.name}</DialogTitle>
                <DialogDescription>
                  {isMe(pendingPerson.id) ? (
                    <>
                      <strong className="text-primary">Autonominación</strong>: tus 🚀 valen {SELF_WEIGHT * 100}% de un voto externo. ¿Qué tan fuerte fue?
                    </>
                  ) : (
                    <>
                      Nominas a <strong className="text-foreground">{pendingPerson.name}</strong>. ¿Qué tan fuerte fue?
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <RocketPicker value={rockets} onChange={setRockets} />
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="¿Qué hizo concretamente? (opcional, pero suma en la presentación)"
                maxLength={180}
                className="bg-muted/40 min-h-[80px]"
              />
              <GameButton onClick={confirm} disabled={saving} variant="gold" size="lg" className="w-full">
                {saving ? "Guardando..." : `🏆 Otorgar · +${XP.castAwardVote} XP`}
              </GameButton>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={proposing} onOpenChange={setProposing}>
        <DialogContent className="bg-card border-neon-magenta/50 max-w-md">
          <DialogHeader className="items-center text-center">
            <Trophy size={90} emoji={pEmoji} active />
            <DialogTitle className="font-display text-gold-gradient text-lg">{pName || "Nuevo premio"}</DialogTitle>
            <DialogDescription>Crea el premio extra de esta semana. Todos podrán votarlo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-1.5">
            {CUSTOM_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setPEmoji(e)}
                className={cn("h-10 w-10 rounded-lg text-xl border", pEmoji === e ? "border-primary bg-primary/15" : "border-border bg-muted/30")}
              >
                {e}
              </button>
            ))}
          </div>
          <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nombre (ej. El/La Salvavidas del Viernes)" maxLength={40} className="bg-muted/40" />
          <Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="¿Qué conducta premia?" maxLength={160} className="bg-muted/40 min-h-[70px]" />
          <div className="flex flex-wrap gap-1.5">
            {RECOGNITION_PILLARS.map((id) => (
              <button
                key={id}
                onClick={() => setPPillar(id)}
                className={cn("chip border px-2.5 py-1", pPillar === id ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}
              >
                {pillarOf(id).emoji} {pillarOf(id).label}
              </button>
            ))}
          </div>
          <GameButton
            variant="violet"
            size="lg"
            className="w-full"
            disabled={pName.trim().length < 3 || saving}
            onClick={async () => {
              if (!onPropose) return;
              setSaving(true);
              try {
                await onPropose({ name: pName.trim(), description: pDesc.trim(), emoji: pEmoji, pillar: pPillar });
                setProposing(false);
                setBurst((b) => b + 1);
              } finally {
                setSaving(false);
              }
            }}
          >
            ➕ Crear premio extra
          </GameButton>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AwardsArena;
~~~

### Archivo: `src/pages/Awards.tsx`

~~~tsx
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
~~~

---

