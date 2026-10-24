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

  // Votes per award: survey answers (one question per award) + legacy award votes
  const voteTotals = useMemo(() => {
    const t: Record<string, number> = {};
    recognitions.forEach((r) => r.question_id && (t[r.question_id] = (t[r.question_id] || 0) + 1));
    awardVotes.forEach((v) => (t[v.category_id] = (t[v.category_id] || 0) + 1));
    return t;
  }, [recognitions, awardVotes]);

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
