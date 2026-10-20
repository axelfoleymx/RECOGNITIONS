# PARTE 2 DE 6 — Rocketing Recognitions 2.0

Ejecuta los pasos de este documento en orden. Copia cada archivo EXACTAMENTE (contenido completo).

Paso 3 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Datos y estilo gamer

`src/index.css` reemplaza al actual completo (cambia la paleta a estilo gamer).

### Archivo: `src/hooks/useGame.ts`

~~~ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AwardCategory,
  AwardVote,
  awardWinners,
  EMPTY_STATS,
  GamePerson,
  Milestone,
  PlayerStats,
  SelfCheckin,
  WeekRecognition,
} from "@/lib/gamification";

// Gamification tables come from a newer migration; if it has not been applied
// yet, these queries resolve to empty data instead of breaking the app.
const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.warn("[game] query failed", e);
    return fallback;
  }
};

export const usePeople = () =>
  useQuery({
    queryKey: ["people-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data as GamePerson[];
    },
  });

export const useMyPerson = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-person", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("people").select("*").eq("user_id", user!.id).maybeSingle();
      return (data as GamePerson | null) ?? null;
    },
  });
};

/** Awards active in a week. `ensure` auto-assigns the rotation the first time (current week only). */
export const useWeekAwards = (weekId?: string, { ensure = true }: { ensure?: boolean } = {}) =>
  useQuery({
    queryKey: ["week-awards", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        if (ensure) await supabase.rpc("ensure_week_awards", { _week_id: weekId! });
        const { data, error } = await supabase
          .from("week_awards")
          .select("position, award_categories(*)")
          .eq("week_id", weekId!)
          .order("position");
        if (error) throw error;
        return (data || [])
          .filter((r: any) => r.award_categories)
          .map((r: any) => ({ ...r.award_categories, position: r.position })) as AwardCategory[];
      }, [] as AwardCategory[]),
  });

export const useWeekAwardVotes = (weekId?: string) =>
  useQuery({
    queryKey: ["award-votes", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase.from("award_votes").select("*").eq("week_id", weekId!);
        if (error) throw error;
        return data as AwardVote[];
      }, [] as AwardVote[]),
  });

export const useWeekRecognitions = (weekId?: string) =>
  useQuery({
    queryKey: ["recognitions", "week-lite", weekId],
    enabled: !!weekId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognitions")
        .select("id, recognized_person_id, author_user_id, message, pillar, is_anonymous, created_at, question_id, rating")
        .eq("week_id", weekId!);
      if (error) {
        // gamification columns may not exist before the migration — retry without them.
        const { data: d2 } = await supabase
          .from("recognitions")
          .select("id, recognized_person_id, author_user_id, message, is_anonymous, created_at")
          .eq("week_id", weekId!);
        return ((d2 || []) as any[]).map((r) => ({ ...r, pillar: null })) as WeekRecognition[];
      }
      return data as WeekRecognition[];
    },
  });

export const useWeekMilestones = (weekId?: string) =>
  useQuery({
    queryKey: ["milestones", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase
          .from("milestones")
          .select("*, milestone_participants(person_id)")
          .eq("week_id", weekId!)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map((m: any) => ({
          ...m,
          participants: (m.milestone_participants || []).map((p: any) => p.person_id),
        })) as Milestone[];
      }, [] as Milestone[]),
  });

export const useRecentRocketers = (weekId?: string) =>
  useQuery({
    queryKey: ["recent-rocketers", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase.rpc("get_recent_rocketers", { _week_id: weekId! });
        if (error) throw error;
        return new Set((data || []).map((r) => r.person_id));
      }, new Set<string>()),
  });

/** All-time stats for the signed-in player (drives XP, level and achievements). */
export const usePlayerStats = () => {
  const { user } = useAuth();
  const { data: me } = useMyPerson();

  return useQuery({
    queryKey: ["player-stats", user?.id, me?.id],
    enabled: !!user,
    queryFn: async (): Promise<PlayerStats> => {
      const uid = user!.id;
      const [given, received, myRocketerVotes, weeks, allVotes] = await Promise.all([
        supabase
          .from("recognitions")
          .select("recognized_person_id, week_id, question_id")
          .eq("author_user_id", uid)
          .then(async (res) =>
            res.error
              ? await supabase.from("recognitions").select("recognized_person_id, week_id").eq("author_user_id", uid)
              : res,
          ),
        me
          ? supabase.from("recognitions").select("id", { count: "exact", head: true }).eq("recognized_person_id", me.id)
          : Promise.resolve({ count: 0 } as any),
        supabase.from("votes").select("id", { count: "exact", head: true }).eq("voter_user_id", uid),
        supabase.from("weeks").select("id, status"),
        supabase.from("votes").select("week_id, voted_person_id"),
      ]);

      const closedWeeks = new Set((weeks.data || []).filter((w) => w.status !== "open").map((w) => w.id));

      const game = await safe(async () => {
        const [myAwardVotes, created, joined, allAwardVotes, checkins] = await Promise.all([
          supabase.from("award_votes").select("week_id").eq("voter_user_id", uid),
          supabase.from("milestones").select("id", { count: "exact", head: true }).eq("created_by", uid),
          me
            ? supabase.from("milestone_participants").select("milestone_id", { count: "exact", head: true }).eq("person_id", me.id)
            : Promise.resolve({ count: 0 } as any),
          me ? supabase.from("award_votes").select("*") : Promise.resolve({ data: [] } as any),
          supabase.from("self_checkins").select("id", { count: "exact", head: true }).eq("user_id", uid),
        ]);
        const perWeek: Record<string, number> = {};
        (myAwardVotes.data || []).forEach((v: any) => (perWeek[v.week_id] = (perWeek[v.week_id] || 0) + 1));

        let awardsWon = 0;
        if (me) {
          const all = ((allAwardVotes.data || []) as AwardVote[]).filter((v) => closedWeeks.has(v.week_id));
          const keys = new Set(all.map((v) => `${v.week_id}|${v.category_id}`));
          keys.forEach((k) => {
            const [wk, cat] = k.split("|");
            const winners = awardWinners(cat, all.filter((v) => v.week_id === wk));
            if (winners.some((w) => w.personId === me.id)) awardsWon++;
          });
        }
        return {
          awardVotesCast: (myAwardVotes.data || []).length,
          bestWeekAwardVotes: Math.max(0, ...Object.values(perWeek)),
          milestonesCreated: created.count ?? 0,
          milestonesJoined: joined.count ?? 0,
          awardsWon,
          checkins: checkins.count ?? 0,
        };
      }, { awardVotesCast: 0, bestWeekAwardVotes: 0, milestonesCreated: 0, milestonesJoined: 0, awardsWon: 0, checkins: 0 });

      let rocketerWins = 0;
      if (me) {
        const byWeek: Record<string, Record<string, number>> = {};
        (allVotes.data || []).forEach((v) => {
          if (!closedWeeks.has(v.week_id)) return;
          byWeek[v.week_id] ||= {};
          byWeek[v.week_id][v.voted_person_id] = (byWeek[v.week_id][v.voted_person_id] || 0) + 1;
        });
        Object.values(byWeek).forEach((counts) => {
          const max = Math.max(...Object.values(counts));
          if (counts[me.id] && counts[me.id] === max) rocketerWins++;
        });
      }

      const givenRows = (given.data || []) as { recognized_person_id: string; week_id: string; question_id?: string | null }[];
      return {
        ...EMPTY_STATS,
        recognitionsGiven: givenRows.length,
        extrasGiven: givenRows.filter((r) => !r.question_id).length,
        surveyWeeks: new Set(givenRows.filter((r) => r.question_id).map((r) => r.week_id)).size,
        distinctRecognized: new Set(givenRows.map((r) => r.recognized_person_id)).size,
        recognitionsReceived: received.count ?? 0,
        rocketerVotesCast: myRocketerVotes.count ?? 0,
        rocketerWins,
        ...game,
      };
    },
  });
};

/** Current user's self-evaluation for a week (null if not done). */
export const useMyCheckin = (weekId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["checkin", weekId, user?.id],
    enabled: !!weekId && !!user,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase
          .from("self_checkins")
          .select("*")
          .eq("week_id", weekId!)
          .eq("user_id", user!.id)
          .maybeSingle();
        if (error) throw error;
        return (data as unknown as SelfCheckin) ?? null;
      }, null as SelfCheckin | null),
  });
};

/** All check-ins of a week (RLS: admins only; others get just their own). */
export const useWeekCheckins = (weekId?: string) =>
  useQuery({
    queryKey: ["checkins", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase.from("self_checkins").select("*").eq("week_id", weekId!);
        if (error) throw error;
        return (data || []) as unknown as SelfCheckin[];
      }, [] as SelfCheckin[]),
  });

/** Anonymous counts per speed for the whole team. */
export const useCheckinPulse = (weekId?: string) =>
  useQuery({
    queryKey: ["checkin-pulse", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase.rpc("get_checkin_pulse", { _week_id: weekId! });
        if (error) throw error;
        return Object.fromEntries((data || []).map((r) => [r.speed, Number(r.total)])) as Record<string, number>;
      }, {} as Record<string, number>),
  });

/** Anonymous mood counts (1–5) for the team-climate index. */
export const useMoodPulse = (weekId?: string) =>
  useQuery({
    queryKey: ["mood-pulse", weekId],
    enabled: !!weekId,
    queryFn: () =>
      safe(async () => {
        const { data, error } = await supabase.rpc("get_mood_pulse", { _week_id: weekId! });
        if (error) throw error;
        return Object.fromEntries((data || []).map((r) => [r.mood, Number(r.total)])) as Record<number, number>;
      }, {} as Record<number, number>),
  });
~~~

### Archivo: `src/index.css`

~~~css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=Chakra+Petch:wght@500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;


@layer base {
  :root {
    --background: 256 48% 5%;
    --foreground: 230 40% 96%;

    --card: 256 40% 9%;
    --card-foreground: 230 40% 96%;

    --popover: 256 40% 9%;
    --popover-foreground: 230 40% 96%;

    --primary: 44 100% 55%;
    --primary-foreground: 256 48% 6%;

    --secondary: 268 45% 22%;
    --secondary-foreground: 230 40% 96%;

    --muted: 256 32% 14%;
    --muted-foreground: 240 16% 66%;

    --accent: 188 100% 55%;
    --accent-foreground: 256 48% 6%;

    --destructive: 352 90% 62%;
    --destructive-foreground: 210 40% 98%;

    --border: 262 30% 24%;
    --input: 262 30% 20%;
    --ring: 44 100% 55%;

    --radius: 0.85rem;

    --sidebar-background: 256 40% 8%;
    --sidebar-foreground: 230 40% 96%;
    --sidebar-primary: 44 100% 55%;
    --sidebar-primary-foreground: 256 48% 6%;
    --sidebar-accent: 268 45% 22%;
    --sidebar-accent-foreground: 230 40% 96%;
    --sidebar-border: 262 30% 24%;
    --sidebar-ring: 44 100% 55%;

    --space-deep: 256 48% 5%;
    --space-nebula: 268 60% 28%;
    --star-gold: 44 100% 55%;
    --nebula-cyan: 188 100% 55%;

    /* Gaming palette */
    --neon-magenta: 318 100% 62%;
    --neon-violet: 266 95% 68%;
    --xp-green: 146 85% 52%;
    --gold-deep: 34 100% 42%;
    --gold-light: 50 100% 75%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', sans-serif;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Orbitron', sans-serif;
  }

  /* Prevent iOS zoom on focus: inputs need >= 16px; use 17px minimum */
  input,
  textarea,
  select,
  [contenteditable="true"] {
    font-size: max(17px, 1em) !important;
  }
}

@layer components {
  .glass-card {
    @apply bg-card/60 backdrop-blur-xl border border-border/60 rounded-xl;
    box-shadow: 0 0 0 1px hsl(var(--neon-violet) / 0.06), 0 10px 30px -12px hsl(0 0% 0% / 0.6), inset 0 1px 0 hsl(var(--foreground) / 0.06);
  }

  .glass-card-glow {
    @apply glass-card;
    box-shadow: 0 0 30px hsl(var(--neon-violet) / 0.16), 0 0 60px hsl(var(--nebula-cyan) / 0.06), inset 0 1px 0 hsl(var(--foreground) / 0.08);
  }

  .neon-border {
    border: 1px solid hsl(var(--star-gold) / 0.55);
    box-shadow: 0 0 14px hsl(var(--star-gold) / 0.25), inset 0 0 12px hsl(var(--star-gold) / 0.08);
  }

  .space-gradient {
    background:
      radial-gradient(1200px 600px at 10% -10%, hsl(var(--neon-violet) / 0.22), transparent 60%),
      radial-gradient(900px 500px at 110% 20%, hsl(var(--neon-magenta) / 0.14), transparent 60%),
      radial-gradient(900px 600px at 50% 120%, hsl(var(--nebula-cyan) / 0.10), transparent 60%),
      hsl(var(--space-deep));
  }

  .portal-ring {
    @apply rounded-full;
    box-shadow: 0 0 15px hsl(var(--nebula-cyan) / 0.45), 0 0 30px hsl(var(--nebula-cyan) / 0.2);
    border: 2px solid hsl(var(--nebula-cyan) / 0.6);
  }

  .btn-space {
    @apply relative overflow-hidden font-semibold;
    background: linear-gradient(180deg, hsl(var(--gold-light)) 0%, hsl(var(--star-gold)) 45%, hsl(var(--gold-deep)) 100%);
    color: hsl(var(--space-deep));
    box-shadow: 0 4px 0 hsl(28 90% 28%), 0 8px 20px -6px hsl(var(--star-gold) / 0.6);
    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }

  .btn-space:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 5px 0 hsl(28 90% 28%), 0 12px 28px -6px hsl(var(--star-gold) / 0.75);
  }

  .btn-space:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 hsl(28 90% 28%), 0 4px 12px -6px hsl(var(--star-gold) / 0.6);
  }

  /* ---------- Gaming HUD ---------- */
  .font-hud {
    font-family: 'Chakra Petch', 'Inter', sans-serif;
  }

  .hud-label {
    font-family: 'Chakra Petch', 'Inter', sans-serif;
    @apply uppercase tracking-[0.22em] text-[11px] font-semibold text-muted-foreground;
  }

  .hud-panel {
    position: relative;
    background: linear-gradient(160deg, hsl(var(--card) / 0.92), hsl(256 40% 7% / 0.92));
    clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
    @apply backdrop-blur-xl;
  }

  .hud-panel::before {
    content: "";
    position: absolute;
    inset: 0;
    padding: 1px;
    background: linear-gradient(135deg, hsl(var(--neon-violet) / 0.7), hsl(var(--nebula-cyan) / 0.25) 40%, hsl(var(--neon-magenta) / 0.5));
    clip-path: inherit;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  .hud-panel-gold::before {
    background: linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--star-gold) / 0.4) 45%, hsl(var(--gold-deep)));
  }

  .xp-track {
    @apply relative h-3 w-full overflow-hidden rounded-full;
    background: hsl(var(--muted));
    box-shadow: inset 0 1px 3px hsl(0 0% 0% / 0.6);
  }

  .xp-fill {
    @apply absolute inset-y-0 left-0 rounded-full;
    background: linear-gradient(90deg, hsl(var(--nebula-cyan)), hsl(var(--xp-green)));
    box-shadow: 0 0 12px hsl(var(--xp-green) / 0.7);
  }

  .xp-fill::after {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(115deg, transparent 0 8px, hsl(0 0% 100% / 0.18) 8px 12px);
    animation: xp-stripes 1.2s linear infinite;
  }

  .text-gold-gradient {
    background: linear-gradient(180deg, hsl(var(--gold-light)) 0%, hsl(var(--star-gold)) 50%, hsl(var(--gold-deep)) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 10px hsl(var(--star-gold) / 0.35));
  }

  .text-neon {
    color: hsl(var(--nebula-cyan));
    text-shadow: 0 0 12px hsl(var(--nebula-cyan) / 0.6);
  }

  .grid-floor {
    position: absolute;
    inset: auto 0 0 0;
    height: 45vh;
    background-image:
      linear-gradient(hsl(var(--neon-violet) / 0.25) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--neon-violet) / 0.25) 1px, transparent 1px);
    background-size: 48px 48px;
    transform: perspective(500px) rotateX(62deg);
    transform-origin: bottom;
    mask-image: linear-gradient(to top, #000 0%, transparent 85%);
    pointer-events: none;
  }

  .chip {
    @apply inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold;
    font-family: 'Chakra Petch', 'Inter', sans-serif;
  }

  .drop-glow {
    filter: drop-shadow(0 0 18px hsl(var(--star-gold) / 0.9)) drop-shadow(0 0 40px hsl(var(--star-gold) / 0.5));
  }
}

/* ---------- Arcade buttons ---------- */
.btn-game {
  border: 1px solid hsl(0 0% 100% / 0.18);
  transition: filter 0.15s ease, box-shadow 0.15s ease;
  text-shadow: 0 1px 0 hsl(0 0% 100% / 0.25);
}
.btn-game::before {
  content: "";
  position: absolute;
  inset: 2px 8px auto 8px;
  height: 30%;
  max-height: 22px;
  border-radius: inherit;
  background: linear-gradient(180deg, hsl(0 0% 100% / 0.22), transparent);
  pointer-events: none;
}
.btn-game:hover:not(:disabled) { filter: brightness(1.1); }
.btn-game-gold {
  color: hsl(var(--space-deep));
  background: linear-gradient(180deg, hsl(var(--gold-light)), hsl(var(--star-gold)) 45%, hsl(var(--gold-deep)));
  box-shadow: 0 6px 0 hsl(28 90% 26%), 0 10px 30px -6px hsl(var(--star-gold) / 0.7);
}
.btn-game-cyan {
  color: hsl(var(--space-deep));
  background: linear-gradient(180deg, hsl(188 100% 80%), hsl(var(--nebula-cyan)) 45%, hsl(196 100% 36%));
  box-shadow: 0 6px 0 hsl(200 100% 20%), 0 10px 30px -6px hsl(var(--nebula-cyan) / 0.7);
}
.btn-game-violet {
  color: white;
  background: linear-gradient(180deg, hsl(270 100% 80%), hsl(var(--neon-violet)) 45%, hsl(272 70% 38%));
  box-shadow: 0 6px 0 hsl(272 70% 20%), 0 10px 30px -6px hsl(var(--neon-violet) / 0.7);
}
.btn-game-danger {
  color: white;
  background: linear-gradient(180deg, hsl(352 100% 78%), hsl(var(--destructive)) 45%, hsl(352 70% 38%));
  box-shadow: 0 6px 0 hsl(352 70% 22%), 0 10px 30px -6px hsl(var(--destructive) / 0.6);
}
.btn-game-ghost {
  color: hsl(var(--foreground));
  background: linear-gradient(180deg, hsl(var(--muted)), hsl(256 40% 9%));
  box-shadow: 0 6px 0 hsl(256 40% 4%), inset 0 0 0 1px hsl(var(--neon-violet) / 0.35);
}

/* ---------- Cockpit ---------- */
.cockpit {
  position: relative;
  border-radius: 28px;
  background:
    radial-gradient(600px 300px at 50% 0%, hsl(var(--neon-violet) / 0.25), transparent 70%),
    linear-gradient(180deg, hsl(256 45% 10%), hsl(256 50% 5%));
  box-shadow: inset 0 0 0 1px hsl(var(--neon-violet) / 0.35), inset 0 0 60px hsl(var(--nebula-cyan) / 0.08), 0 30px 60px -30px hsl(0 0% 0% / 0.8);
}
.cockpit::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: repeating-linear-gradient(0deg, transparent 0 3px, hsl(0 0% 100% / 0.025) 3px 4px);
  pointer-events: none;
}
.system-card {
  position: relative;
  background: linear-gradient(180deg, hsl(256 40% 13%), hsl(256 45% 8%));
  border: 1px solid hsl(var(--border));
  box-shadow: 0 6px 0 hsl(256 45% 4%), inset 0 1px 0 hsl(0 0% 100% / 0.06);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.system-card:hover { border-color: hsl(var(--nebula-cyan) / 0.6); }
.system-card-next {
  border-color: hsl(var(--neon-violet));
  animation: next-glow 1.6s ease-in-out infinite;
}
.system-card-done {
  border-color: hsl(var(--xp-green) / 0.55);
  background: linear-gradient(180deg, hsl(150 40% 11%), hsl(256 45% 8%));
}
@keyframes next-glow {
  0%, 100% { box-shadow: 0 6px 0 hsl(272 70% 20%), 0 0 0 0 hsl(var(--neon-violet) / 0.5); }
  50% { box-shadow: 0 6px 0 hsl(272 70% 20%), 0 0 28px 4px hsl(var(--neon-violet) / 0.55); }
}
.status-light {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.status-pending { background: hsl(var(--destructive)); box-shadow: 0 0 10px hsl(var(--destructive)); animation: blink 1s steps(2, start) infinite; }
.status-partial { background: hsl(var(--star-gold)); box-shadow: 0 0 10px hsl(var(--star-gold)); }
.status-done { background: hsl(var(--xp-green)); box-shadow: 0 0 12px hsl(var(--xp-green)); }

@keyframes blink { to { visibility: hidden; } }

@keyframes radar-pulse {
  0% { box-shadow: 0 0 0 0 hsl(var(--nebula-cyan) / 0.7); }
  100% { box-shadow: 0 0 0 14px hsl(var(--nebula-cyan) / 0); }
}
.radar-pulse { animation: radar-pulse 1.4s ease-out infinite; }

@keyframes xp-stripes {
  from { background-position: 0 0; }
  to { background-position: 24px 0; }
}

@keyframes shine-sweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  60%, 100% { transform: translateX(220%) skewX(-20deg); }
}

.shine::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.35), transparent);
  animation: shine-sweep 3.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-twinkle {
  animation: twinkle var(--duration, 3s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

/* Parallax star drift */
@keyframes star-drift {
  0% { transform: translateY(0px); }
  100% { transform: translateY(-14px); }
}

.star-drift-1 {
  animation: twinkle var(--duration, 3s) ease-in-out infinite,
    star-drift 18s ease-in-out infinite alternate;
  animation-delay: var(--delay, 0s), 0s;
}

.star-drift-2 {
  animation: twinkle var(--duration, 3s) ease-in-out infinite,
    star-drift 11s ease-in-out infinite alternate;
  animation-delay: var(--delay, 0s), 0s;
}

/* Shooting stars */
@keyframes shoot {
  0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(18deg) scaleX(0.2); }
  1% { opacity: 1; }
  10% { opacity: 0; transform: translate3d(60vw, 35vh, 0) rotate(18deg) scaleX(1); }
  100% { opacity: 0; transform: translate3d(60vw, 35vh, 0) rotate(18deg) scaleX(1); }
}

.shooting-star {
  position: absolute;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, hsl(var(--foreground) / 0) 0%, hsl(var(--foreground) / 0.9) 60%, hsl(var(--nebula-cyan) / 0.9) 100%);
  filter: drop-shadow(0 0 6px hsl(var(--nebula-cyan) / 0.7));
  opacity: 0;
  transform-origin: left center;
  animation: shoot 16s linear infinite;
  animation-delay: var(--delay, 0s);
}


/* Soft nebula glows */
.nebula-glow {
  position: absolute;
  border-radius: 9999px;
  filter: blur(90px);
  opacity: 0.18;
  pointer-events: none;
}

.nebula-a {
  width: 40vw;
  height: 40vw;
  top: -10vh;
  left: -8vw;
  background: radial-gradient(circle, hsl(var(--nebula-cyan)) 0%, transparent 70%);
  animation: float 14s ease-in-out infinite;
}

.nebula-b {
  width: 45vw;
  height: 45vw;
  bottom: -15vh;
  right: -10vw;
  background: radial-gradient(circle, hsl(var(--space-nebula)) 0%, transparent 70%);
  animation: float 18s ease-in-out infinite reverse;
}

/* Infinite marquee for the people carousel */
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee var(--marquee-duration, 40s) linear infinite;
}

.marquee-paused {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .radar-pulse,
  .status-pending,
  .xp-fill::after,
  .shine::after,
  .animate-marquee,
  .shooting-star,
  .nebula-glow {
    animation: none;
  }
}
~~~

---

Paso 4 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Componentes base

### Archivo: `tailwind.config.ts`

~~~ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Inter", "sans-serif"],
        hud: ["Chakra Petch", "Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        space: {
          deep: "hsl(var(--space-deep))",
          nebula: "hsl(var(--space-nebula))",
        },
        star: {
          gold: "hsl(var(--star-gold))",
        },
        nebula: {
          cyan: "hsl(var(--nebula-cyan))",
        },
        neon: {
          magenta: "hsl(var(--neon-magenta))",
          violet: "hsl(var(--neon-violet))",
        },
        xp: "hsl(var(--xp-green))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
~~~

### Archivo: `src/components/game/Trophy.tsx`

~~~tsx
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrophyProps {
  size?: number;
  /** emoji engraved on the cup */
  emoji?: string;
  /** glows and bounces (e.g. while a person is dragged over it) */
  active?: boolean;
  /** violet aura for the Rocketer mega trophy */
  variant?: "gold" | "mega";
  className?: string;
}

/** Golden award statuette drawn in SVG (no external assets). */
const Trophy = ({ size = 120, emoji, active = false, variant = "gold", className }: TrophyProps) => {
  const uid = useId().replace(/:/g, "");
  const gold = `gold-${uid}`;
  const goldV = `goldv-${uid}`;
  const aura = `aura-${uid}`;

  return (
    <motion.div
      className={cn("relative inline-flex items-end justify-center select-none", className)}
      style={{ width: size, height: size * 1.33 }}
      animate={active ? { scale: 1.12, rotate: [0, -4, 4, -2, 0] } : { scale: 1, rotate: 0 }}
      transition={active ? { duration: 0.5 } : { type: "spring", stiffness: 260, damping: 18 }}
    >
      <svg
        viewBox="0 0 120 160"
        width={size}
        height={size * 1.33}
        className={cn("overflow-visible transition-[filter] duration-300", active && "drop-glow")}
        aria-hidden
      >
        <defs>
          <linearGradient id={gold} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#8A4F00" />
            <stop offset="22%" stopColor="#F2B200" />
            <stop offset="40%" stopColor="#FFF3B8" />
            <stop offset="58%" stopColor="#FFD23F" />
            <stop offset="82%" stopColor="#C77F00" />
            <stop offset="100%" stopColor="#7A4200" />
          </linearGradient>
          <linearGradient id={goldV} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFE680" />
            <stop offset="100%" stopColor="#A86200" />
          </linearGradient>
          <radialGradient id={aura} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={variant === "mega" ? "#B66BFF" : "#FFD23F"} stopOpacity="0.55" />
            <stop offset="100%" stopColor={variant === "mega" ? "#B66BFF" : "#FFD23F"} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* aura */}
        <ellipse cx="60" cy="62" rx="64" ry="64" fill={`url(#${aura})`} opacity={active ? 1 : 0.55} />

        {/* handles */}
        <path d="M24 24 C2 24 2 62 34 66" fill="none" stroke={`url(#${goldV})`} strokeWidth="8" strokeLinecap="round" />
        <path d="M96 24 C118 24 118 62 86 66" fill="none" stroke={`url(#${goldV})`} strokeWidth="8" strokeLinecap="round" />

        {/* cup */}
        <path d="M20 12 H100 V40 C100 74 82 94 60 98 C38 94 20 74 20 40 Z" fill={`url(#${gold})`} />
        <ellipse cx="60" cy="12" rx="40" ry="5" fill="#FFF3B8" opacity="0.9" />
        <ellipse cx="60" cy="12" rx="34" ry="3" fill="#B87400" opacity="0.6" />
        {/* highlight */}
        <path d="M32 20 C30 50 38 74 52 88" fill="none" stroke="#FFFBE6" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />

        {/* stem */}
        <rect x="52" y="96" width="16" height="16" fill={`url(#${gold})`} />
        <ellipse cx="60" cy="112" rx="14" ry="5" fill={`url(#${gold})`} />
        <path d="M40 118 H80 L88 136 H32 Z" fill={`url(#${gold})`} />

        {/* plinth */}
        <rect x="22" y="136" width="76" height="20" rx="3" fill="#1A1033" stroke="#FFD23F" strokeOpacity="0.5" />
        <rect x="40" y="141" width="40" height="10" rx="2" fill={`url(#${gold})`} />

        {emoji && (
          <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" fontSize="30">
            {emoji}
          </text>
        )}
      </svg>
    </motion.div>
  );
};

export default Trophy;
~~~

### Archivo: `src/components/game/Medal.tsx`

~~~tsx
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MedalProps {
  size?: number;
  emoji?: string;
  active?: boolean;
  className?: string;
}

/** Gold medal with ribbon (used for Recognitions; trophies are for awards). */
const Medal = ({ size = 120, emoji = "★", active = false, className }: MedalProps) => {
  const uid = useId().replace(/:/g, "");
  const gold = `mgold-${uid}`;
  const rim = `mrim-${uid}`;
  return (
    <motion.div
      className={cn("relative inline-flex justify-center select-none", className)}
      style={{ width: size, height: size * 1.4 }}
      animate={active ? { scale: 1.1, rotate: [0, -6, 6, -3, 0] } : { scale: 1, rotate: 0 }}
      transition={active ? { duration: 0.5 } : { type: "spring", stiffness: 260, damping: 18 }}
    >
      <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={cn("overflow-visible", active && "drop-glow")} aria-hidden>
        <defs>
          <radialGradient id={gold} cx="38%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="35%" stopColor="#FFD23F" />
            <stop offset="75%" stopColor="#E09A00" />
            <stop offset="100%" stopColor="#8A4F00" />
          </radialGradient>
          <linearGradient id={rim} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFF3B8" />
            <stop offset="50%" stopColor="#B87400" />
            <stop offset="100%" stopColor="#FFE07A" />
          </linearGradient>
        </defs>
        {/* ribbon */}
        <path d="M22 0 H44 L60 54 H38 Z" fill="#7C3AED" />
        <path d="M30 0 H36 L52 54 H46 Z" fill="#22D3EE" opacity="0.9" />
        <path d="M78 0 H56 L40 54 H62 Z" fill="#9333EA" />
        <path d="M70 0 H64 L48 54 H54 Z" fill="#F472B6" opacity="0.85" />
        {/* clasp */}
        <rect x="36" y="50" width="28" height="10" rx="3" fill={`url(#${rim})`} />
        {/* disc */}
        <circle cx="50" cy="96" r="38" fill={`url(#${rim})`} />
        <circle cx="50" cy="96" r="32" fill={`url(#${gold})`} />
        <circle cx="50" cy="96" r="26" fill="none" stroke="#FFF3B8" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M30 80 C36 70 46 66 56 67" fill="none" stroke="#FFFBE6" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
        <text x="50" y="98" textAnchor="middle" dominantBaseline="middle" fontSize="26" fill="#8A4F00" fontWeight="700">
          {emoji}
        </text>
      </svg>
    </motion.div>
  );
};

export default Medal;
~~~

### Archivo: `src/components/game/GameButton.tsx`

~~~tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "gold" | "cyan" | "violet" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  gold: "btn-game-gold",
  cyan: "btn-game-cyan",
  violet: "btn-game-violet",
  ghost: "btn-game-ghost",
  danger: "btn-game-danger",
};

type Props = Omit<HTMLMotionProps<"button">, "children"> &
  Pick<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    variant?: Variant;
    size?: "md" | "lg" | "xl";
    children?: React.ReactNode;
  };

/** Chunky arcade-style button with bevel, glow and press feedback. */
const GameButton = forwardRef<HTMLButtonElement, Props>(({ variant = "gold", size = "lg", className, children, disabled, ...rest }, ref) => (
  <motion.button
    ref={ref}
    whileHover={disabled ? undefined : { y: -2 }}
    whileTap={disabled ? undefined : { y: 3, scale: 0.98 }}
    disabled={disabled}
    className={cn(
      "btn-game relative inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.14em] select-none",
      size === "md" && "h-11 px-5 text-[11px] rounded-xl",
      size === "lg" && "h-14 px-7 text-xs md:text-sm rounded-2xl",
      size === "xl" && "h-16 md:h-20 px-8 text-sm md:text-base rounded-2xl",
      VARIANTS[variant],
      disabled && "saturate-0 brightness-[0.6] cursor-not-allowed",
      className,
    )}
    {...rest}
  >
    {children}
  </motion.button>
));
GameButton.displayName = "GameButton";

export default GameButton;
~~~

### Archivo: `src/components/game/PlayerAvatar.tsx`

~~~tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/gamification";

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  ring?: "cyan" | "gold" | "violet" | "none";
  className?: string;
}

const RINGS = {
  cyan: "0 0 0 2px hsl(var(--nebula-cyan) / 0.8), 0 0 16px hsl(var(--nebula-cyan) / 0.45)",
  gold: "0 0 0 3px hsl(var(--star-gold)), 0 0 22px hsl(var(--star-gold) / 0.6)",
  violet: "0 0 0 2px hsl(var(--neon-violet) / 0.85), 0 0 16px hsl(var(--neon-violet) / 0.45)",
  none: "none",
};

const PlayerAvatar = ({ name, photoUrl, size = 48, ring = "cyan", className }: PlayerAvatarProps) => (
  <Avatar
    className={cn("shrink-0 rounded-full", className)}
    style={{ width: size, height: size, boxShadow: RINGS[ring] }}
  >
    {photoUrl && <AvatarImage src={photoUrl} alt={name} className="object-cover" draggable={false} />}
    <AvatarFallback
      className="bg-gradient-to-br from-secondary to-muted text-foreground font-hud font-bold"
      style={{ fontSize: Math.max(10, size * 0.34) }}
    >
      {initials(name)}
    </AvatarFallback>
  </Avatar>
);

export default PlayerAvatar;
~~~

### Archivo: `src/components/game/XpBar.tsx`

~~~tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface XpBarProps {
  value: number; // 0..1
  className?: string;
  fillClassName?: string;
}

const XpBar = ({ value, className, fillClassName }: XpBarProps) => (
  <div className={cn("xp-track", className)}>
    <motion.div
      className={cn("xp-fill", fillClassName)}
      initial={{ width: 0 }}
      animate={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    />
  </div>
);

export default XpBar;
~~~

### Archivo: `src/components/game/RocketPicker.tsx`

~~~tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LABELS = ["", "Bien hecho", "Muy por encima", "¡Épico!"];

interface RocketPickerProps {
  value: number;
  onChange: (v: number) => void;
}

/** 1–3 rocket intensity selector used in peer votes. */
const RocketPicker = ({ value, onChange }: RocketPickerProps) => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex gap-3">
      {[1, 2, 3].map((n) => (
        <motion.button
          key={n}
          type="button"
          whileTap={{ scale: 0.85 }}
          animate={n <= value ? { y: -6, scale: 1.15 } : { y: 0, scale: 1 }}
          onClick={() => onChange(n)}
          aria-label={`${n} cohete${n > 1 ? "s" : ""}`}
          className={cn(
            "h-14 w-14 rounded-xl text-3xl flex items-center justify-center border transition-colors",
            n <= value
              ? "border-primary/70 bg-primary/15 shadow-[0_0_18px_hsl(var(--star-gold)/0.45)]"
              : "border-border bg-muted/40 grayscale opacity-50",
          )}
        >
          🚀
        </motion.button>
      ))}
    </div>
    <span className="hud-label text-primary">{LABELS[value]}</span>
  </div>
);

export default RocketPicker;
~~~

### Archivo: `src/components/game/DragPeople.tsx`

~~~tsx
import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { firstName, GamePerson } from "@/lib/gamification";
import PlayerAvatar from "./PlayerAvatar";

// Drop zones are plain elements marked with data-dropzone="<id>".
// Dragging is pointer based (framer-motion) so it works with mouse and touch;
// tapping a person and then a zone is the accessible fallback.

const clientPoint = (e: MouseEvent | TouchEvent | PointerEvent) => {
  if ("changedTouches" in e && e.changedTouches.length) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
};

export const zoneAt = (x: number, y: number): string | null => {
  for (const el of document.elementsFromPoint(x, y)) {
    const zone = (el as HTMLElement).closest?.("[data-dropzone]");
    if (zone) return zone.getAttribute("data-dropzone");
  }
  return null;
};

export type TokenState = { disabled?: boolean; badge?: string; hint?: string; highlight?: boolean; done?: boolean };

interface DraggablePersonProps {
  person: GamePerson;
  size?: number;
  selected?: boolean;
  state?: TokenState;
  onHover: (zone: string | null) => void;
  onDrop: (personId: string, zone: string) => void;
  onSelect: (personId: string) => void;
}

export const DraggablePerson = ({ person, size = 60, selected, state, onHover, onDrop, onSelect }: DraggablePersonProps) => {
  const disabled = !!state?.disabled;
  // framer can emit a tap at the end of a drag; ignore it
  const dragged = useRef(false);
  return (
    <div className="flex flex-col items-center gap-1 w-[76px]" title={state?.hint}>
      <motion.button
        type="button"
        drag={!disabled}
        dragSnapToOrigin
        dragMomentum={false}
        dragElastic={1}
        whileHover={disabled ? undefined : { scale: 1.08 }}
        whileDrag={{ scale: 1.2, zIndex: 80, cursor: "grabbing" }}
        onDragStart={() => (dragged.current = true)}
        onDrag={(e) => {
          const p = clientPoint(e);
          onHover(zoneAt(p.x, p.y));
        }}
        onDragEnd={(e) => {
          const p = clientPoint(e);
          const zone = zoneAt(p.x, p.y);
          onHover(null);
          if (zone) onDrop(person.id, zone);
          setTimeout(() => (dragged.current = false), 50);
        }}
        onTap={() => {
          if (dragged.current || disabled) return;
          onSelect(person.id);
        }}
        className={cn(
          "relative rounded-full touch-none outline-none",
          state?.highlight && !selected && "radar-pulse",
          disabled ? "opacity-35 grayscale cursor-not-allowed" : "cursor-grab",
          selected && "ring-4 ring-primary ring-offset-2 ring-offset-background",
        )}
        style={{ zIndex: 1 }}
        aria-label={`Arrastra a ${person.name}`}
        aria-pressed={selected}
      >
        <PlayerAvatar
          name={person.name}
          photoUrl={person.photo_url}
          size={size}
          ring={selected || state?.done ? "gold" : state?.highlight ? "cyan" : "none"}
          className={cn(!state?.highlight && !selected && !state?.done && "opacity-80")}
        />
        {state?.badge && (
          <span className="absolute -top-1 -right-2 chip bg-background/90 border border-border px-1.5 py-0.5 text-[10px] text-foreground">
            {state.badge}
          </span>
        )}
      </motion.button>
      <span
        className={cn(
          "text-[11px] leading-tight text-center line-clamp-1 w-full",
          state?.highlight ? "text-accent font-semibold" : "text-muted-foreground",
        )}
      >
        {firstName(person.name)}
      </span>
      {state?.highlight && (
        <span className="font-hud text-[9px] font-bold tracking-wider rounded bg-accent/20 text-accent px-1.5 leading-4">SIN RECOG.</span>
      )}
    </div>
  );
};

interface PeopleTrayProps {
  people: GamePerson[];
  selectedId: string | null;
  stateFor?: (p: GamePerson) => TokenState | undefined;
  onHover: (zone: string | null) => void;
  onDrop: (personId: string, zone: string) => void;
  onSelect: (personId: string | null) => void;
  title?: string;
  className?: string;
}

export const PeopleTray = ({ people, selectedId, stateFor, onHover, onDrop, onSelect, title, className }: PeopleTrayProps) => (
  <div className={cn("glass-card relative z-30 p-4", className)}>
    <div className="flex items-center justify-between mb-3 gap-2">
      <span className="hud-label">{title ?? "Tripulación"}</span>
      <span className="text-xs text-muted-foreground">
        {selectedId ? "Ahora toca un trofeo 🏆" : "Arrastra una foto al trofeo · o tócala"}
      </span>
    </div>
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
      {people.map((p) => (
        <DraggablePerson
          key={p.id}
          person={p}
          selected={selectedId === p.id}
          state={stateFor?.(p)}
          onHover={onHover}
          onDrop={(pid, z) => {
            onSelect(null);
            onDrop(pid, z);
          }}
          onSelect={(pid) => onSelect(selectedId === pid ? null : pid)}
        />
      ))}
    </div>
  </div>
);
~~~

### Archivo: `src/components/game/ClimateMeter.tsx`

~~~tsx
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
~~~

---

