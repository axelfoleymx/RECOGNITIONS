// Dev-only playground (route /demo, registered only when import.meta.env.DEV).
// Renders every gamified screen with mock data so the UI can be reviewed
// without signing in or touching Supabase.
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GameShell from "@/components/game/GameShell";
import HomeHud from "@/components/game/HomeHud";
import AwardsArena from "@/components/game/AwardsArena";
import RecognitionSurvey from "@/components/game/RecognitionSurvey";
import RocketerArena from "@/components/game/RocketerArena";
import MilestonesBoard from "@/components/game/MilestonesBoard";
import SelfCheckinPanel from "@/components/game/SelfCheckinPanel";
import AwardsPhase from "@/components/celebration/AwardsPhase";
import MilestonesPhase from "@/components/celebration/MilestonesPhase";
import SurveyPhase from "@/components/celebration/SurveyPhase";
import PulsePhase from "@/components/celebration/PulsePhase";
import WinnerRevealPhase from "@/components/celebration/WinnerRevealPhase";
import RecognitionsPhase, { groupRecognitions } from "@/components/celebration/RecognitionsPhase";
import StarField from "@/components/StarField";
import { AwardsHeader } from "./Awards";
import {
  AwardCategory,
  AwardVote,
  awardStandings,
  buildWeekSummary,
  GamePerson,
  Milestone,
  questionOf,
  SelfCheckin,
  SURVEY_QUESTIONS,
  surveyStandings,
  WeekRecognition,
  xpFor,
} from "@/lib/gamification";
import { cn } from "@/lib/utils";

const ME = "user-me";
const NAMES = [
  "Axel Martínez", "Sofía Ramírez", "Diego Hernández", "Valeria López", "Mateo García", "Camila Torres",
  "Santiago Flores", "Regina Castillo", "Emiliano Vargas", "Ximena Ruiz", "Leonardo Ortiz", "Mariana Silva",
  "Andrés Morales", "Fernanda Cruz",
];
const PEOPLE: GamePerson[] = NAMES.map((name, i) => ({ id: `p${i}`, name, photo_url: null, user_id: i === 0 ? ME : `user-${i}` }));

const BASE_CATEGORIES: AwardCategory[] = [
  { id: "c1", slug: "puntual", name: "El/La Más Puntual", description: "Llega a tiempo a juntas, calls y entregas.", emoji: "⏰", pillar: "actitud" },
  { id: "c2", slug: "deadline", name: "Deadline Killer", description: "Termina lo que empieza, en tiempo y forma.", emoji: "✅", pillar: "productividad" },
  { id: "c3", slug: "cliente", name: "Héroe del Cliente", description: "Responde rápido, resuelve y deja al cliente feliz.", emoji: "💬", pillar: "cliente" },
  { id: "c4", slug: "buena-vibra", name: "Buena Vibra", description: "Contagia buena actitud y levanta al equipo.", emoji: "🌞", pillar: "actitud" },
  { id: "c5", slug: "emprendedor", name: "Iniciativa Emprendedora", description: "Propone y ejecuta sin que se lo pidan.", emoji: "🚀", pillar: "emprendedor" },
];

const seedVotes = (): AwardVote[] => {
  const v: AwardVote[] = [];
  let n = 0;
  for (let voter = 1; voter < 12; voter++) {
    BASE_CATEGORIES.forEach((c, ci) => {
      if ((voter + ci) % 3 === 0) return;
      const nominee = (voter * 3 + ci * 5) % PEOPLE.length || 1;
      if (nominee === voter) return;
      v.push({
        id: `v${n++}`, week_id: "w", category_id: c.id, voter_user_id: `user-${voter}`, nominee_person_id: `p${nominee}`,
        rockets: ((voter + ci) % 3) + 1, reason: ci === 1 ? "Entregó el reporte mensual antes del deadline y sin errores." : "",
      });
    });
  }
  return v;
};

const seedRecs = (): WeekRecognition[] => {
  const out: WeekRecognition[] = [];
  let n = 0;
  for (let author = 2; author < 10; author++) {
    SURVEY_QUESTIONS.forEach((q, qi) => {
      [1, 2, 5, 7].forEach((pi, k) => {
        if ((author + qi + k) % 3 === 0 || pi === author) return;
        out.push({
          id: `r${n++}`, recognized_person_id: `p${pi}`, author_user_id: `user-${author}`, is_anonymous: false,
          message: k === 0 && qi === 1 ? "Atendió la llamada de emergencia del cliente a las 8pm y lo dejó tranquilo." : q.statement,
          pillar: q.pillar, question_id: q.id, rating: ((author + k) % 3) + 1, created_at: "2026-10-14T10:00:00",
        });
      });
    });
  }
  out.push({ id: "x1", recognized_person_id: "p3", author_user_id: "user-4", is_anonymous: false, message: "Propuso automatizar los reportes con Looker y ya lo implementó.", pillar: "emprendedor", question_id: null, rating: null });
  return out;
};

const MILESTONES: Milestone[] = [
  { id: "m1", week_id: "w", title: "Lanzamos la campaña Buen Fin de Cliente Aurora", description: "+35% CTR vs. campaña anterior", kind: "campana", impact: 3, created_by: "user-2", created_at: "", participants: ["p1", "p2", "p5"] },
  { id: "m2", week_id: "w", title: "Firmamos a Café Origen como cliente nuevo", description: "Retainer de 6 meses", kind: "cliente", impact: 3, created_by: "user-4", created_at: "", participants: ["p4", "p7"] },
  { id: "m3", week_id: "w", title: "Nuevo template de reporte semanal", description: "Ahorra ~2h por cuenta", kind: "mejora", impact: 2, created_by: ME, created_at: "", participants: ["p0", "p3"] },
];

const OTHER_CHECKINS: SelfCheckin[] = [
  { week_id: "w", user_id: "user-1", person_id: "p1", speed: "maximo", reason: "Cerré dos campañas", blockers: [], next_step: "", milestone_ids: ["m1"], ratings: { "a-tiempo": 3 } },
  { week_id: "w", user_id: "user-2", person_id: "p2", speed: "crucero", reason: "Semana normal", blockers: [], next_step: "", milestone_ids: [], ratings: {} },
  { week_id: "w", user_id: "user-3", person_id: "p3", speed: "bajo", reason: "Esperé aprobaciones", blockers: ["Esperando al cliente"], next_step: "", milestone_ids: [], ratings: { ayuda: 2 } },
  { week_id: "w", user_id: "user-6", person_id: "p6", speed: "maximo", reason: "Mucho avance", blockers: [], next_step: "", milestone_ids: [], ratings: {} },
  { week_id: "w", user_id: "user-8", person_id: "p8", speed: "bajo", reason: "Me enfermé", blockers: ["Tema personal / salud", "Esperando al cliente"], next_step: "", milestone_ids: [], ratings: {} },
];

const TABS = ["Nave", "Premios", "Recognitions", "Rocketer", "Hitos", "Autoevaluación", "Presentación"] as const;
type Tab = (typeof TABS)[number] | "Diploma";

// The demo follows the same URLs as the real app, so the top menu, the
// bottom bar and the dashboard buttons all switch screens here too.
const TAB_PATH: Record<Tab, string> = {
  Nave: "/",
  Premios: "/awards",
  Recognitions: "/recognize",
  Rocketer: "/vote",
  Hitos: "/milestones",
  Autoevaluación: "/checkin",
  Presentación: "/admin",
  Diploma: "/my-recognitions",
};
const tabForPath = (path: string): Tab =>
  (Object.entries(TAB_PATH).find(([, p]) => p === path)?.[0] as Tab | undefined) ?? "Nave";

const Demo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabForPath(location.pathname);
  const setTab = (t: Tab) => {
    navigate(TAB_PATH[t]);
    window.scrollTo({ top: 0 });
  };
  const recognizeTarget = new URLSearchParams(location.search).get("to");
  const [votes, setVotes] = useState<AwardVote[]>(seedVotes);
  const [categories, setCategories] = useState(BASE_CATEGORIES);
  const [recs, setRecs] = useState<WeekRecognition[]>(seedRecs);
  const [milestones, setMilestones] = useState(MILESTONES);
  const [rocketer, setRocketer] = useState<{ personId: string; reason: string } | null>(null);
  const [checkin, setCheckin] = useState<SelfCheckin | null>(null);
  const [slide, setSlide] = useState({ phase: 0, index: 0 });

  const peopleById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
  const myVotes = votes.filter((v) => v.voter_user_id === ME);
  const voteTotals = votes.reduce<Record<string, number>>((t, v) => ((t[v.category_id] = (t[v.category_id] || 0) + 1), t), {});
  const surveyDone = recs.some((r) => r.author_user_id === ME && r.question_id);
  const summary = useMemo(
    () =>
      buildWeekSummary({
        userId: ME, people: PEOPLE, recognitions: recs, awardVotes: votes, milestones, categoriesCount: categories.length,
        votedRocketer: !!rocketer, rocketerVoters: 7, checkinDone: !!checkin, myPersonId: "p0",
      }),
    [recs, votes, milestones, rocketer, checkin, categories.length],
  );
  const stats = {
    recognitionsGiven: 24, extrasGiven: 3, surveyWeeks: 3 + (surveyDone ? 1 : 0), distinctRecognized: 9, recognitionsReceived: 11,
    awardVotesCast: 18 + myVotes.length, rocketerVotesCast: 6, milestonesCreated: 2, milestonesJoined: 3, checkins: 2 + (checkin ? 1 : 0),
    awardsWon: 2, rocketerWins: 0, bestWeekAwardVotes: Math.max(4, myVotes.length),
  };
  const allCheckins = checkin ? [...OTHER_CHECKINS, checkin] : OTHER_CHECKINS;
  const speedPulse = allCheckins.reduce<Record<string, number>>((t, c) => ((t[c.speed] = (t[c.speed] || 0) + 1), t), {});
  const radarIds = new Set(summary.radar.map((p) => p.id));

  if (tab === "Presentación") {
    const awardResults = categories.map((c) => ({ category: c, standings: awardStandings(c.id, votes) }));
    const commentRecs = recs.filter((r) => !r.question_id || r.message !== questionOf(r.question_id)?.statement);
    const groups = groupRecognitions(
      commentRecs.map((r) => ({ ...r, people: { name: peopleById[r.recognized_person_id].name, photo_url: null }, profiles: { full_name: "Equipo" } })),
    );
    const phases = ["pulse", "milestones", "survey", "recognitions", "awards", "reveal"] as const;
    const phase = phases[slide.phase];
    const last = phase === "survey" ? SURVEY_QUESTIONS.length - 1 : phase === "awards" ? awardResults.length - 1 : 0;
    return (
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: "hsl(var(--space-deep))" }}
        onClick={() =>
          setSlide((s) => (s.index < last ? { ...s, index: s.index + 1 } : { phase: (s.phase + 1) % phases.length, index: phases[(s.phase + 1) % phases.length] === "awards" ? -1 : 0 }))
        }
      >
        <StarField />
        <button onClick={(e) => { e.stopPropagation(); setTab("Nave"); }} className="absolute top-4 left-4 z-50 chip bg-muted text-foreground">
          ← Salir del demo
        </button>
        <div className="relative z-10 h-full">
          {phase === "pulse" && <PulsePhase checkins={allCheckins} />}
          {phase === "milestones" && <MilestonesPhase milestones={milestones} peopleById={peopleById} />}
          {phase === "survey" && (
            <SurveyPhase key={slide.index} index={slide.index} standings={surveyStandings(SURVEY_QUESTIONS[slide.index].id, recs, allCheckins)} peopleById={peopleById} />
          )}
          {phase === "recognitions" && <RecognitionsPhase groups={groups} totalRecognitions={commentRecs.length} slide={0} />}
          {phase === "awards" && <AwardsPhase key={slide.index} results={awardResults} index={slide.index} peopleById={peopleById} />}
          {phase === "reveal" && (
            <WinnerRevealPhase winners={[{ name: "Sofía Ramírez", photoUrl: null, voteCount: 7 }]} videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
          )}
        </div>
      </div>
    );
  }

  return (
    <GameShell player={{ name: "Axel Martínez", xp: xpFor(stats) }} hideReminder>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="chip bg-destructive/20 text-destructive">DEMO · datos ficticios</span>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("chip border", tab === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Nave" && (
        <HomeHud
          playerName="Axel Martínez" myPerson={PEOPLE[0]} stats={stats} systems={summary.systems} speedPulse={speedPulse} weekKey="demo"
          categories={categories} voteTotals={voteTotals} myAwardVotes={summary.myAwardVotes} votedRocketer={!!rocketer}
          radar={summary.radar.filter((p) => p.user_id !== ME)} milestones={milestones} peopleById={summary.peopleById}
          team={summary.team} topGivers={summary.topGivers} weekLabel="13 oct – 17 oct 2026" endDate="2026-10-17" isAdmin
        />
      )}

      {tab === "Diploma" && (
        <div className="cockpit p-8 text-center space-y-2">
          <p className="text-5xl">🎓</p>
          <h1 className="font-display text-2xl text-gold-gradient">Mi Diploma</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            En la app real aquí ves tu diploma de la semana con los reconocimientos que recibiste. Esta pantalla no cambia con el rediseño.
          </p>
        </div>
      )}

      {tab === "Premios" && (
        <>
          <AwardsHeader endDate="2026-10-17" />
          <AwardsArena
            people={PEOPLE} categories={categories} myVotes={myVotes} voteTotals={voteTotals} myUserId={ME}
            canPropose={!categories.some((c) => c.is_custom)}
            onPropose={async (a) => setCategories((cur) => [...cur, { id: "custom", slug: "custom", is_custom: true, ...a }])}
            onCast={async (v) =>
              setVotes((cur) => [
                ...cur.filter((x) => !(x.voter_user_id === ME && x.category_id === v.categoryId)),
                { id: crypto.randomUUID(), week_id: "w", category_id: v.categoryId, voter_user_id: ME, nominee_person_id: v.personId, rockets: v.rockets, reason: v.reason, is_self: v.personId === "p0" },
              ])
            }
            onClear={async (cid) => setVotes((cur) => cur.filter((x) => !(x.voter_user_id === ME && x.category_id === cid)))}
          />
        </>
      )}

      {tab === "Recognitions" && (
        <RecognitionSurvey
          people={PEOPLE} myUserId={ME} radarIds={radarIds} alreadyDone={surveyDone} onFinish={() => setTab("Nave")}
          initialPersonId={recognizeTarget}
          onSubmit={async ({ answers, extra, anonymous }) =>
            setRecs((cur) => [
              ...cur,
              ...answers.map((a) => ({
                id: crypto.randomUUID(), recognized_person_id: a.personId, author_user_id: ME, is_anonymous: anonymous,
                message: a.comment || questionOf(a.questionId)!.statement, pillar: questionOf(a.questionId)!.pillar, question_id: a.questionId, rating: a.rating,
              })),
              ...(extra ? [{ id: crypto.randomUUID(), recognized_person_id: extra.personId, author_user_id: ME, is_anonymous: anonymous, message: extra.message, pillar: extra.pillar, question_id: null, rating: null }] : []),
            ])
          }
        />
      )}

      {tab === "Rocketer" && (
        <RocketerArena
          people={PEOPLE} myUserId={ME} cooldownIds={new Set(["p1"])} existing={rocketer}
          onVote={async (personId, reason) => setRocketer({ personId, reason })}
          onAnnul={async () => setRocketer(null)}
        />
      )}

      {tab === "Hitos" && (
        <MilestonesBoard
          people={PEOPLE} milestones={milestones} myUserId={ME}
          onCreate={async (m) => setMilestones((cur) => [{ ...m, id: crypto.randomUUID(), week_id: "w", created_by: ME, created_at: "" }, ...cur])}
          onDelete={async (id) => setMilestones((cur) => cur.filter((m) => m.id !== id))}
        />
      )}

      {tab === "Autoevaluación" && (
        <SelfCheckinPanel
          milestones={milestones} peopleById={peopleById} myPersonId="p0" initial={checkin}
          onSave={async (c) => setCheckin({ ...c, week_id: "w", user_id: ME, person_id: "p0" })}
          onGoMilestones={() => setTab("Hitos")}
        />
      )}
    </GameShell>
  );
};

export default Demo;
