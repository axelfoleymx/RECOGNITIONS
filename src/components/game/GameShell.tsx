import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Award, CircleHelp, Flag, Gauge, Home, LogOut, Medal, Rocket, Shield, Trophy } from "lucide-react";
import OnboardingTour, { tourSeen } from "./OnboardingTour";
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
  const [tourOpen, setTourOpen] = useState(false);

  // First visit: open the walkthrough once (it can be reopened with "?")
  useEffect(() => {
    if ((user || player) && !tourSeen()) setTourOpen(true);
  }, [user, player]);

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
              <button
                onClick={() => setTourOpen(true)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50"
                aria-label="Cómo funciona"
                title="Cómo funciona"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
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
      <OnboardingTour open={tourOpen} onOpenChange={setTourOpen} />
    </div>
  );
};

export default GameShell;
