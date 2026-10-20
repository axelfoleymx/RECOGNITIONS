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
