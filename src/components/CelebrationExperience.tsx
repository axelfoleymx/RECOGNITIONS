import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StarField from "@/components/StarField";
import IntroPhase from "./celebration/IntroPhase";
import RecognitionsPhase, { CelebrationRecognition, groupRecognitions, GROUPS_PER_SLIDE } from "./celebration/RecognitionsPhase";
import MilestonesPhase from "./celebration/MilestonesPhase";
import AwardsPhase from "./celebration/AwardsPhase";
import SurveyPhase from "./celebration/SurveyPhase";
import PulsePhase from "./celebration/PulsePhase";
import { usePeople, useWeekAwards, useWeekAwardVotes, useWeekCheckins, useWeekMilestones } from "@/hooks/useGame";
import { awardStandings, questionOf, SURVEY_QUESTIONS, surveyStandings } from "@/lib/gamification";
import BirthdaysPhase, { BirthdayPerson } from "./celebration/BirthdaysPhase";
import TopVotedPhase from "./celebration/TopVotedPhase";
import SuspensePhase from "./celebration/SuspensePhase";
import WinnerRevealPhase from "./celebration/WinnerRevealPhase";
import ClosingPhase from "./celebration/ClosingPhase";

type Phase = "intro" | "birthdays" | "pulse" | "milestones" | "survey" | "recognitions" | "awards" | "top" | "suspense" | "reveal" | "closing";

type Recognition = CelebrationRecognition;

interface VoteEntry {
  personId: string;
  name: string;
  photoUrl: string | null;
  count: number;
  reasons: string[];
}

interface CelebrationExperienceProps {
  weekLabel: string;
  weekId: string;
  recognitions: Recognition[];
  sortedVotes: VoteEntry[];
  onClose: () => void;
  /** YouTube link of the (single) winner, played on the reveal slide */
  winnerVideoUrl?: string | null;
}

const PHASES: Phase[] = ["intro", "birthdays", "pulse", "milestones", "survey", "recognitions", "awards", "top", "suspense", "reveal", "closing"];

/** Returns birthdays matching the 7-day window starting from weekStartDate (Mon). */
const filterBirthdaysForWeek = (
  people: { id: string; name: string; photo_url: string | null; song_url: string | null; birthday: string | null }[],
  weekStartDate: string
): BirthdayPerson[] => {
  const start = new Date(weekStartDate + "T00:00:00");
  const window: { m: number; d: number; offset: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    window.push({ m: d.getMonth() + 1, d: d.getDate(), offset: i });
  }

  return people
    .filter((p) => p.birthday)
    .map((p) => {
      const [, mm, dd] = p.birthday!.split("-").map(Number);
      const match = window.find((w) => w.m === mm && w.d === dd);
      return match ? { person: p, offset: match.offset } : null;
    })
    .filter((x): x is { person: typeof people[number]; offset: number } => x !== null)
    .sort((a, b) => a.offset - b.offset)
    .map(({ person }) => ({
      id: person.id,
      name: person.name,
      photo_url: person.photo_url,
      song_url: person.song_url,
      birthday: person.birthday!,
    }));
};

const CelebrationExperience = ({
  weekLabel,
  weekId,
  recognitions,
  sortedVotes,
  onClose,
  winnerVideoUrl,
}: CelebrationExperienceProps) => {
  const [phase, setPhase] = useState<Phase>("intro");
  // Survey answers are shown as one ranking per question; only written
  // comments and extra medals go to the condensed wall (one card per person).
  const commentRecs = useMemo(
    () => recognitions.filter((r) => !r.question_id || r.message !== questionOf(r.question_id)?.statement),
    [recognitions],
  );
  const recGroups = useMemo(() => groupRecognitions(commentRecs), [commentRecs]);
  const recSlides = Math.ceil(recGroups.length / GROUPS_PER_SLIDE);
  const [recIndex, setRecIndex] = useState(0);

  // Gamification data for this week
  const { data: people = [] } = usePeople();
  const { data: categories = [] } = useWeekAwards(weekId, { ensure: false });
  const { data: awardVotes = [] } = useWeekAwardVotes(weekId);
  const { data: milestones = [] } = useWeekMilestones(weekId);
  const { data: checkins = [] } = useWeekCheckins(weekId);
  const surveyResults = useMemo(
    () => SURVEY_QUESTIONS.map((q) => surveyStandings(q.id, recognitions as any, checkins)),
    [recognitions, checkins],
  );
  const surveyCount = recognitions.filter((r) => r.question_id).length;
  const [surveyIndex, setSurveyIndex] = useState(0);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const awardResults = useMemo(
    () => categories.map((c) => ({ category: c, standings: awardStandings(c.id, awardVotes) })),
    [categories, awardVotes],
  );
  const [awardIndex, setAwardIndex] = useState(-1);
  const [topRevealIndex, setTopRevealIndex] = useState(-1);
  const [birthdayIndex, setBirthdayIndex] = useState(-1); // -1 = teaser, 0..n = person
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const drumrollRef = useRef<HTMLAudioElement | null>(null);
  const revealRef = useRef<HTMLAudioElement | null>(null);
  const birthdaySongRef = useRef<HTMLAudioElement | null>(null);

  // Fetch week + birthdays
  const { data: birthdays = [] } = useQuery({
    queryKey: ["birthdays", weekId],
    queryFn: async () => {
      const { data: weekData } = await (supabase.from("weeks").select("start_date").eq("id", weekId).maybeSingle() as any);
      if (!weekData?.start_date) return [];
      const { data: peopleData } = await (supabase
        .from("people")
        .select("id, name, photo_url, song_url, birthday, active")
        .eq("active", true)
        .eq("approved", true) as any);
      if (!peopleData) return [];
      return filterBirthdaysForWeek(peopleData as any, weekData.start_date);
    },
  });

  // Create audio elements on mount
  useEffect(() => {
    const audio = new Audio("/audio/Award_Music_Winner.mp3");
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const drumroll = new Audio("/audio/Redoble_de_Tambores.mp3");
    drumroll.loop = true;
    drumroll.volume = volume * 1.3;
    drumrollRef.current = drumroll;

    const reveal = new Audio("/audio/Winner_Reveal.mp3");
    reveal.loop = true;
    reveal.volume = volume;
    revealRef.current = reveal;

    return () => {
      audio.pause();
      drumroll.pause();
      reveal.pause();
      if (birthdaySongRef.current) birthdaySongRef.current.pause();
    };
  }, []);

  // Control music per phase — only restart when changing audio track
  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    const drumroll = drumrollRef.current;
    const reveal = revealRef.current;
    if (!audio || !drumroll || !reveal) return;

    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Determine which track each phase uses
    const trackFor = (p: Phase | null) => {
      if (p === "pulse" || p === "milestones" || p === "survey" || p === "recognitions" || p === "awards" || p === "top") return "audio";
      if (p === "suspense") return "drumroll";
      // The winner's YouTube video brings its own audio on the reveal slide
      if (p === "reveal") return winnerVideoUrl ? null : "reveal";
      if (p === "closing") return "reveal";
      return null;
    };

    const prevTrack = trackFor(prev);
    const curTrack = trackFor(phase);

    // Adjust volume based on phase
    const phaseVolume = phase === "recognitions" ? volume * 0.10 : volume;
    audio.volume = phaseVolume;

    // If same track, don't restart
    if (prevTrack === curTrack && curTrack !== null) return;

    // Stop main tracks (birthday song handled separately)
    audio.pause();
    drumroll.pause();
    reveal.pause();

    if (curTrack === "audio") {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else if (curTrack === "drumroll") {
      drumroll.currentTime = 0;
      drumroll.play().catch(() => {});
    } else if (curTrack === "reveal") {
      reveal.currentTime = 0;
      reveal.play().catch(() => {});
    }
  }, [phase]);

  // Birthday song handling: play current person's song; pause on teaser/leave.
  useEffect(() => {
    // Always stop previous birthday song when index/phase changes
    if (birthdaySongRef.current) {
      birthdaySongRef.current.pause();
      birthdaySongRef.current = null;
    }

    if (phase !== "birthdays" || birthdayIndex < 0) return;

    // Birthday slide plays a YouTube video with its own audio — keep other audio silent.
    return;
    // eslint-disable-next-line no-unreachable
    const person = birthdays[birthdayIndex];
    if (!person?.song_url) return;

    const song = new Audio(person.song_url);
    song.loop = true;
    song.volume = volume;
    song.muted = muted;
    birthdaySongRef.current = song;
    song.play().catch(() => {});

    return () => {
      song.pause();
    };
  }, [phase, birthdayIndex, birthdays]);

  // Mute/unmute all
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (drumrollRef.current) drumrollRef.current.muted = muted;
    if (revealRef.current) revealRef.current.muted = muted;
    if (birthdaySongRef.current) birthdaySongRef.current.muted = muted;
  }, [muted]);

  // Sync volume
  useEffect(() => {
    const phaseVolume = phase === "recognitions" ? volume * 0.10 : volume;
    if (audioRef.current) audioRef.current.volume = phaseVolume;
    if (drumrollRef.current) drumrollRef.current.volume = Math.min(volume * 1.3, 1);
    if (revealRef.current) revealRef.current.volume = volume;
    if (birthdaySongRef.current) birthdaySongRef.current.volume = volume;
  }, [volume, phase]);

  const hasVotes = sortedVotes.length > 0;
  const maxCount = sortedVotes[0]?.count ?? 0;
  const winners = sortedVotes.filter((v) => v.count === maxCount);
  const topPositions = sortedVotes.filter((v) => v.count < maxCount).reverse();

  const isPhaseValid = useCallback(
    (p: Phase) => {
      if (p === "recognitions" && recGroups.length === 0) return false;
      if (p === "milestones" && milestones.length === 0) return false;
      if (p === "survey" && surveyCount === 0) return false;
      if (p === "pulse" && checkins.length === 0) return false;
      if (p === "awards" && (awardResults.length === 0 || awardVotes.length === 0)) return false;
      if (p === "birthdays" && birthdays.length === 0) return false;
      if (p === "top" && (!hasVotes || sortedVotes.length < 2)) return false;
      if (p === "suspense" && winners.length === 0) return false;
      if (p === "reveal" && winners.length === 0) return false;
      return true;
    },
    [recGroups.length, milestones.length, surveyCount, checkins.length, awardResults.length, awardVotes.length, birthdays.length, hasVotes, sortedVotes.length, winners.length]
  );

  const getNextPhase = useCallback(
    (current: Phase): Phase | null => {
      const idx = PHASES.indexOf(current);
      for (let i = idx + 1; i < PHASES.length; i++) {
        if (isPhaseValid(PHASES[i])) return PHASES[i];
      }
      return null;
    },
    [isPhaseValid]
  );

  const getPrevPhase = useCallback(
    (current: Phase): Phase | null => {
      const idx = PHASES.indexOf(current);
      for (let i = idx - 1; i >= 0; i--) {
        if (isPhaseValid(PHASES[i])) return PHASES[i];
      }
      return null;
    },
    [isPhaseValid]
  );

  const goNext = useCallback(() => {
    if (phase === "recognitions") {
      if (recIndex < recSlides - 1) {
        setRecIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "survey") {
      if (surveyIndex < SURVEY_QUESTIONS.length - 1) {
        setSurveyIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "awards") {
      if (awardIndex < awardResults.length - 1) {
        setAwardIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "birthdays") {
      if (birthdayIndex < birthdays.length - 1) {
        setBirthdayIndex((i) => i + 1);
        return;
      }
    }
    if (phase === "top") {
      if (topRevealIndex < topPositions.length - 1) {
        setTopRevealIndex((i) => i + 1);
        return;
      }
    }
    const next = getNextPhase(phase);
    if (next) {
      if (next === "recognitions") setRecIndex(0);
      if (next === "awards") setAwardIndex(-1);
      if (next === "survey") setSurveyIndex(0);
      if (next === "birthdays") setBirthdayIndex(-1);
      if (next === "top") setTopRevealIndex(-1);
      setPhase(next);
    }
  }, [phase, recIndex, recSlides, surveyIndex, awardIndex, awardResults.length, birthdayIndex, birthdays.length, topRevealIndex, topPositions.length, getNextPhase]);

  const goPrev = useCallback(() => {
    if (phase === "recognitions") {
      if (recIndex > 0) {
        setRecIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "survey") {
      if (surveyIndex > 0) {
        setSurveyIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "awards") {
      if (awardIndex > -1) {
        setAwardIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "birthdays") {
      if (birthdayIndex > -1) {
        setBirthdayIndex((i) => i - 1);
        return;
      }
    }
    if (phase === "top") {
      if (topRevealIndex >= 0) {
        setTopRevealIndex((i) => i - 1);
        return;
      }
    }
    const prev = getPrevPhase(phase);
    if (prev) {
      if (prev === "recognitions") setRecIndex(Math.max(0, recSlides - 1));
      if (prev === "awards") setAwardIndex(awardResults.length - 1);
      if (prev === "survey") setSurveyIndex(SURVEY_QUESTIONS.length - 1);
      if (prev === "birthdays") setBirthdayIndex(birthdays.length - 1);
      if (prev === "top") setTopRevealIndex(topPositions.length - 1);
      setPhase(prev);
    }
  }, [phase, recIndex, surveyIndex, awardIndex, awardResults.length, birthdayIndex, birthdays.length, topRevealIndex, getPrevPhase, recSlides, topPositions.length]);

  // Fullscreen
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Skip invalid phases on mount/change
  useEffect(() => {
    if (!isPhaseValid(phase) && phase !== "intro" && phase !== "closing") {
      const next = getNextPhase(phase);
      if (next) setPhase(next);
    }
  }, [phase, isPhaseValid, getNextPhase]);

  const handleClick = (e: React.MouseEvent) => {
    // During the birthday slide clicking only triggers confetti, never navigation.
    if (phase === "birthdays" && birthdayIndex >= 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverSide(x < rect.width / 2 ? "left" : "right");
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] overflow-hidden cursor-default"
      style={{ background: "hsl(var(--space-deep))" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverSide(null)}
    >
      <StarField />

      {/* Audio controls */}
      <div
        className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full transition-opacity duration-300 hover:opacity-100 opacity-60"
        style={{ background: "hsl(var(--space-deep) / 0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (v > 0 && muted) setMuted(false);
            if (v === 0) setMuted(true);
          }}
          className="w-20 h-1 accent-foreground cursor-pointer"
        />
        <button
          className="p-1 rounded-full"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? (
            <VolumeX className="h-5 w-5 text-foreground" />
          ) : (
            <Volume2 className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 transition-opacity duration-300 pointer-events-none"
        style={{ opacity: hoverSide === "left" ? 0.3 : 0 }}
      >
        <ChevronLeft className="h-12 w-12 text-foreground" />
      </div>
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 transition-opacity duration-300 pointer-events-none"
        style={{ opacity: hoverSide === "right" ? 0.3 : 0 }}
      >
        <ChevronRight className="h-12 w-12 text-foreground" />
      </div>

      <div className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <IntroPhase key="intro" weekLabel={weekLabel} />
          )}

          {phase === "pulse" && <PulsePhase key="pulse" checkins={checkins} />}

          {phase === "survey" && (
            <SurveyPhase key={`survey-${surveyIndex}`} index={surveyIndex} standings={surveyResults[surveyIndex]} peopleById={peopleById} />
          )}

          {phase === "milestones" && (
            <MilestonesPhase key="milestones" milestones={milestones} peopleById={peopleById} />
          )}

          {phase === "recognitions" && (
            <RecognitionsPhase
              key="recognitions"
              groups={recGroups}
              totalRecognitions={commentRecs.length}
              slide={recIndex}
            />
          )}

          {phase === "awards" && (
            <AwardsPhase key={`awards-${awardIndex}`} results={awardResults} index={awardIndex} peopleById={peopleById} />
          )}

          {phase === "birthdays" && birthdays.length > 0 && (
            <BirthdaysPhase
              key={`birthdays-${birthdayIndex}`}
              birthdays={birthdays}
              index={birthdayIndex}
              onFinish={goNext}
            />
          )}

          {phase === "top" && hasVotes && sortedVotes.length >= 2 && (
            <TopVotedPhase
              key="top"
              topVoted={sortedVotes.map((v) => ({
                personId: v.personId,
                name: v.name,
                photoUrl: v.photoUrl,
                count: v.count,
                reasons: v.reasons,
              }))}
              maxVotes={sortedVotes[0].count}
              revealedIndex={topRevealIndex}
              tiedCount={winners.length}
            />
          )}

          {phase === "suspense" && winners.length > 0 && (
            <SuspensePhase key="suspense" />
          )}

          {phase === "reveal" && winners.length > 0 && (
            <WinnerRevealPhase
              key="reveal"
              winners={winners.map((w) => ({
                name: w.name,
                photoUrl: w.photoUrl,
                voteCount: w.count,
              }))}
              videoUrl={winners.length === 1 ? winnerVideoUrl : null}
            />
          )}

          {phase === "closing" && (
            <ClosingPhase
              key="closing"
              weekId={weekId}
              winners={winners.map((w) => ({
                name: w.name,
                reasons: w.reasons,
              }))}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CelebrationExperience;
