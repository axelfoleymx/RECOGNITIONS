// Core rules of the Rocketing gamification layer: pillars, survey questions,
// self-evaluation, XP, levels, achievements, launch systems and scoring.
// Pure functions only so they can be reused by pages, the presentation and the dev demo.

export type GamePerson = {
  id: string;
  name: string;
  photo_url: string | null;
  user_id?: string | null;
  birthday?: string | null;
  approved?: boolean;
};

export type AwardCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  pillar: string;
  position?: number;
  is_custom?: boolean;
  created_by?: string | null;
};

export type AwardVote = {
  id: string;
  week_id: string;
  category_id: string;
  voter_user_id: string;
  nominee_person_id: string;
  rockets: number;
  reason: string;
  is_self?: boolean;
};

export type Milestone = {
  id: string;
  week_id: string;
  title: string;
  description: string;
  kind: string;
  impact: number;
  created_by: string;
  created_at: string;
  participants: string[];
};

export type WeekRecognition = {
  id: string;
  recognized_person_id: string;
  author_user_id: string | null;
  message: string;
  pillar: string | null;
  is_anonymous: boolean;
  created_at?: string;
  question_id?: string | null;
  rating?: number | null;
};

export type SelfCheckin = {
  id?: string;
  week_id: string;
  user_id: string;
  person_id?: string | null;
  speed: SpeedId;
  reason: string;
  blockers: string[];
  next_step: string;
  milestone_ids: string[];
  ratings: Record<string, number>;
  /** how the person felt this week, 1 (triste) … 5 (¡wow!) */
  mood?: number | null;
  /** asked for a hand from the team (only HR sees it) */
  wants_support?: boolean;
};

/** Self-evaluation is worth half of an external vote. */
export const SELF_WEIGHT = 0.5;

// ---------------------------------------------------------------- pillars

export const PILLARS: Record<string, { label: string; emoji: string; hue: string }> = {
  productividad: { label: "Productividad", emoji: "⚡", hue: "188 100% 55%" },
  cliente: { label: "Atención a cliente", emoji: "💬", hue: "318 100% 62%" },
  actitud: { label: "Buena actitud", emoji: "🌞", hue: "44 100% 55%" },
  emprendedor: { label: "Emprendedor", emoji: "🚀", hue: "18 100% 58%" },
  creatividad: { label: "Creatividad", emoji: "🎨", hue: "266 95% 68%" },
  colaboracion: { label: "Colaboración", emoji: "🤝", hue: "146 85% 52%" },
  resultados: { label: "Resultados", emoji: "📈", hue: "210 100% 62%" },
  crecimiento: { label: "Crecimiento", emoji: "📚", hue: "170 80% 48%" },
};

export const RECOGNITION_PILLARS = [
  "productividad",
  "cliente",
  "actitud",
  "emprendedor",
  "creatividad",
  "colaboracion",
] as const;

export const pillarOf = (id: string | null | undefined) =>
  (id && PILLARS[id]) || { label: "General", emoji: "✨", hue: "240 16% 66%" };

// ------------------------------------------------------ survey questions

export const SURVEY_QUESTIONS = [
  {
    id: "a-tiempo",
    emoji: "⏱️",
    pillar: "productividad",
    question: "¿Quién entregó todo a tiempo esta semana?",
    statement: "Entregó todo a tiempo esta semana",
    self: "¿Entregaste todo a tiempo?",
  },
  {
    id: "cliente",
    emoji: "💬",
    pillar: "cliente",
    question: "¿Quién brilló con el cliente?",
    statement: "Brilló en la atención al cliente",
    self: "¿Cómo fue tu atención al cliente?",
  },
  {
    id: "ayuda",
    emoji: "🤝",
    pillar: "colaboracion",
    question: "¿Quién te ayudó o te salvó el día?",
    statement: "Ayudó al equipo y salvó el día",
    self: "¿Cuánto ayudaste a otros?",
  },
  {
    id: "actitud",
    emoji: "🌞",
    pillar: "actitud",
    question: "¿Quién contagió buena actitud?",
    statement: "Contagió buena actitud al equipo",
    self: "¿Cómo estuvo tu actitud?",
  },
  {
    id: "iniciativa",
    emoji: "🚀",
    pillar: "emprendedor",
    question: "¿Quién propuso o resolvió algo sin que se lo pidieran?",
    statement: "Tomó la iniciativa sin que se lo pidieran",
    self: "¿Tomaste iniciativa?",
  },
] as const;

export const questionOf = (id: string | null | undefined) => SURVEY_QUESTIONS.find((q) => q.id === id);

/** Max people that can receive the top 3-rocket rating per question (avoids inflation). */
export const MAX_TOP_RATINGS = 3;

export const RATING_LABELS = ["", "Bien", "Muy bien", "¡Épico!"];

// --------------------------------------------------- self-evaluation

// ---------------------------------------------------- team climate (eNPS)

export const MOODS: { value: number; emoji: string; label: string; hue: string }[] = [
  { value: 5, emoji: "🤩", label: "¡Wow!", hue: "44 100% 55%" },
  { value: 4, emoji: "😊", label: "Feliz", hue: "146 85% 52%" },
  { value: 3, emoji: "😐", label: "Normal", hue: "188 100% 55%" },
  { value: 2, emoji: "😕", label: "Desanimado", hue: "28 95% 58%" },
  { value: 1, emoji: "😢", label: "Triste", hue: "352 90% 62%" },
];

export const moodOf = (v: number | null | undefined) => MOODS.find((m) => m.value === v);

/**
 * eNPS-style climate index from mood counts: % happy (4–5) minus % sad (1–2),
 * from −100 to +100. Neutral (3) counts in the total only.
 */
export const climateIndex = (counts: Record<number | string, number>) => {
  const n = (v: number) => Number(counts[v] || 0);
  const total = [1, 2, 3, 4, 5].reduce((t, v) => t + n(v), 0);
  if (!total) return { total: 0, index: 0, positive: 0, negative: 0 };
  const positive = (n(4) + n(5)) / total;
  const negative = (n(1) + n(2)) / total;
  return { total, index: Math.round((positive - negative) * 100), positive, negative };
};

export const climateLabel = (index: number) =>
  index >= 50 ? "Excelente" : index >= 20 ? "Bueno" : index >= 0 ? "Regular" : "Necesita atención";

export type SpeedId = "bajo" | "crucero" | "maximo";

export const SPEEDS: Record<SpeedId, { emoji: string; label: string; prompt: string; hue: string; needle: number }> = {
  bajo: {
    emoji: "🐢",
    label: "Bajo mi velocidad",
    prompt: "Esta semana fui bajo mi velocidad porque…",
    hue: "352 90% 62%",
    needle: -60,
  },
  crucero: {
    emoji: "🛰️",
    label: "Velocidad crucero",
    prompt: "Esta semana mantuve el ritmo porque…",
    hue: "188 100% 55%",
    needle: 0,
  },
  maximo: {
    emoji: "⚡",
    label: "Di el máximo",
    prompt: "Esta semana siento que di el máximo porque…",
    hue: "44 100% 55%",
    needle: 60,
  },
};

export const BLOCKERS = [
  "Mucha carga de trabajo",
  "Esperando al cliente",
  "Dependía de otra persona",
  "Falta de claridad",
  "Tema personal / salud",
  "Herramientas o accesos",
];

// ------------------------------------------------------------ milestones

export const MILESTONE_KINDS: Record<string, { label: string; emoji: string }> = {
  entrega: { label: "Entrega / lanzamiento", emoji: "🏁" },
  cliente: { label: "Cliente feliz / nuevo", emoji: "🤝" },
  campana: { label: "Resultado de campaña", emoji: "📈" },
  mejora: { label: "Mejora interna", emoji: "🛠️" },
  aprendizaje: { label: "Aprendizaje", emoji: "🎓" },
};

export const milestoneKind = (id: string) => MILESTONE_KINDS[id] || { label: id, emoji: "⭐" };

// ------------------------------------------------------------------- XP

export const XP = {
  completeSurvey: 25,
  giveRecognition: 10, // extra / open recognition with medal
  castAwardVote: 5,
  castRocketerVote: 10,
  createMilestone: 15,
  joinMilestone: 10,
  selfCheckin: 20,
  receiveRecognition: 5,
  winAward: 30,
  winRocketer: 50,
  launchBonus: 30,
} as const;

export const LEVELS = [
  { min: 0, title: "Cadete", emoji: "🧑‍🚀" },
  { min: 100, title: "Piloto", emoji: "🛩️" },
  { min: 250, title: "Navegante", emoji: "🧭" },
  { min: 500, title: "Comandante", emoji: "🎖️" },
  { min: 900, title: "Capitán Estelar", emoji: "🌟" },
  { min: 1500, title: "Leyenda", emoji: "👑" },
];

export const levelFor = (xp: number) => {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const progress = next ? (xp - cur.min) / (next.min - cur.min) : 1;
  return { index: idx + 1, ...cur, next, progress: Math.max(0, Math.min(1, progress)) };
};

export type PlayerStats = {
  recognitionsGiven: number;
  extrasGiven: number;
  surveyWeeks: number;
  distinctRecognized: number;
  recognitionsReceived: number;
  awardVotesCast: number;
  rocketerVotesCast: number;
  milestonesCreated: number;
  milestonesJoined: number;
  checkins: number;
  awardsWon: number;
  rocketerWins: number;
  /** max award votes cast in a single week */
  bestWeekAwardVotes: number;
};

export const EMPTY_STATS: PlayerStats = {
  recognitionsGiven: 0,
  extrasGiven: 0,
  surveyWeeks: 0,
  distinctRecognized: 0,
  recognitionsReceived: 0,
  awardVotesCast: 0,
  rocketerVotesCast: 0,
  milestonesCreated: 0,
  milestonesJoined: 0,
  checkins: 0,
  awardsWon: 0,
  rocketerWins: 0,
  bestWeekAwardVotes: 0,
};

// Survey answers give a flat reward per week (selecting everyone gives no extra XP).
export const xpFor = (s: PlayerStats) =>
  s.surveyWeeks * XP.completeSurvey +
  s.extrasGiven * XP.giveRecognition +
  s.awardVotesCast * XP.castAwardVote +
  s.rocketerVotesCast * XP.castRocketerVote +
  s.milestonesCreated * XP.createMilestone +
  s.milestonesJoined * XP.joinMilestone +
  s.checkins * XP.selfCheckin +
  s.recognitionsReceived * XP.receiveRecognition +
  s.awardsWon * XP.winAward +
  s.rocketerWins * XP.winRocketer;

export const ACHIEVEMENTS: {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (s: PlayerStats) => boolean;
}[] = [
  { id: "first", emoji: "🛸", title: "Primer Despegue", description: "Completaste tu primera encuesta de recognitions", check: (s) => s.surveyWeeks >= 1 || s.recognitionsGiven >= 1 },
  { id: "ambassador", emoji: "🎖️", title: "Embajador", description: "4 semanas completando la encuesta", check: (s) => s.surveyWeeks >= 4 },
  { id: "explorer", emoji: "🔭", title: "Explorador", description: "Reconociste a 8 personas distintas", check: (s) => s.distinctRecognized >= 8 },
  { id: "full-vote", emoji: "🗳️", title: "Votante Total", description: "Votaste todos los premios en una semana", check: (s) => s.bestWeekAwardVotes >= 5 },
  { id: "mirror", emoji: "🪞", title: "Espejo Honesto", description: "4 autoevaluaciones", check: (s) => s.checkins >= 4 },
  { id: "multitask", emoji: "🧩", title: "Multitarea", description: "Participaste en 3 hitos", check: (s) => s.milestonesJoined >= 3 },
  { id: "collector", emoji: "🏆", title: "Coleccionista", description: "Ganaste 3 mini-awards", check: (s) => s.awardsWon >= 3 },
  { id: "rocketer", emoji: "🌟", title: "Rocketer", description: "Fuiste Rocketer de la Semana", check: (s) => s.rocketerWins >= 1 },
];

// -------------------------------------------------------- launch systems

export type LaunchSystem = {
  id: "awards" | "recognitions" | "rocketer" | "milestones" | "checkin";
  emoji: string;
  title: string;
  subtitle: string;
  progress: number;
  goal: number;
  xp: number;
  to: string;
};

export const launchSystems = (w: {
  awardVotes: number;
  awardsActive: number;
  surveyAnswered: number;
  votedRocketer: boolean;
  milestonesTouched: number;
  checkinDone: boolean;
}): LaunchSystem[] => {
  const awards = w.awardsActive || 5;
  return [
    { id: "awards", emoji: "🏆", title: "Premios", subtitle: `Vota ${awards} premios`, progress: Math.min(w.awardVotes, awards), goal: awards, xp: awards * XP.castAwardVote, to: "/awards" },
    { id: "recognitions", emoji: "🏅", title: "Recognitions", subtitle: "Encuesta de 5 preguntas", progress: w.surveyAnswered > 0 ? 1 : 0, goal: 1, xp: XP.completeSurvey, to: "/recognize" },
    { id: "rocketer", emoji: "🚀", title: "Rocketer", subtitle: "Elige al MVP", progress: w.votedRocketer ? 1 : 0, goal: 1, xp: XP.castRocketerVote, to: "/vote" },
    { id: "milestones", emoji: "🏁", title: "Hitos", subtitle: "Registra o súmate", progress: Math.min(1, w.milestonesTouched), goal: 1, xp: XP.createMilestone, to: "/milestones" },
    { id: "checkin", emoji: "🪞", title: "Autoevaluación", subtitle: "¿Cómo te sentiste esta semana?", progress: w.checkinDone ? 1 : 0, goal: 1, xp: XP.selfCheckin, to: "/checkin" },
  ];
};

// --------------------------------------------------------- award scoring

export type AwardStanding = { personId: string; rockets: number; votes: number; selfRockets: number; reasons: string[] };

/** Points = external rockets + self rockets × ½. */
export const awardStandings = (categoryId: string, votes: AwardVote[]): AwardStanding[] => {
  const map = new Map<string, AwardStanding>();
  for (const v of votes) {
    if (v.category_id !== categoryId) continue;
    const s = map.get(v.nominee_person_id) || { personId: v.nominee_person_id, rockets: 0, votes: 0, selfRockets: 0, reasons: [] };
    const w = v.is_self ? SELF_WEIGHT : 1;
    s.rockets += v.rockets * w;
    if (v.is_self) s.selfRockets += v.rockets * w;
    else s.votes += 1;
    if (v.reason?.trim() && !v.is_self) s.reasons.push(v.reason.trim());
    map.set(v.nominee_person_id, s);
  }
  return [...map.values()].sort((a, b) => b.rockets - a.rockets || b.votes - a.votes);
};

export const awardWinners = (categoryId: string, votes: AwardVote[]) => {
  const s = awardStandings(categoryId, votes);
  if (!s.length) return [];
  const top = s[0];
  return s.filter((x) => x.rockets === top.rockets && x.votes === top.votes);
};

/** Max awards a single voter may give to the same nominee in one week. */
export const MAX_AWARDS_PER_NOMINEE = 2;
/** Self-nominations allowed per week (each worth ½). */
export const MAX_SELF_NOMINATIONS = 1;

// -------------------------------------------------------- survey scoring

export type SurveyStanding = {
  personId: string;
  points: number;
  votes: number;
  selfPoints: number;
  comments: string[];
};

/** Ranking for one survey question: external ratings + self rating × ½. */
export const surveyStandings = (
  questionId: string,
  recs: WeekRecognition[],
  checkins: Pick<SelfCheckin, "person_id" | "ratings">[] = [],
): SurveyStanding[] => {
  const q = questionOf(questionId);
  const map = new Map<string, SurveyStanding>();
  const get = (id: string) => map.get(id) || { personId: id, points: 0, votes: 0, selfPoints: 0, comments: [] };
  recs.forEach((r) => {
    if (r.question_id !== questionId) return;
    const s = get(r.recognized_person_id);
    s.points += r.rating || 1;
    s.votes += 1;
    if (r.message && r.message !== q?.statement && !r.is_anonymous) s.comments.push(r.message);
    map.set(r.recognized_person_id, s);
  });
  checkins.forEach((c) => {
    const rating = c.ratings?.[questionId];
    if (!c.person_id || !rating) return;
    const s = get(c.person_id);
    s.points += rating * SELF_WEIGHT;
    s.selfPoints += rating * SELF_WEIGHT;
    map.set(c.person_id, s);
  });
  return [...map.values()].filter((s) => s.votes > 0 || s.selfPoints > 0).sort((a, b) => b.points - a.points || b.votes - a.votes);
};

// ------------------------------------------------------------- helpers

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

export const firstName = (name: string) => name.split(/\s+/)[0] || name;

/** Time remaining until Friday 23:59 of the given week end date (YYYY-MM-DD). */
export const timeLeft = (endDate: string, now = new Date()) => {
  const end = new Date(endDate + "T23:59:59");
  const ms = Math.max(0, end.getTime() - now.getTime());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { ms, d, h, m, label: ms === 0 ? "Cerrada" : d > 0 ? `${d}d ${h}h` : `${h}h ${m}m` };
};

// ------------------------------------------------------ home aggregation

/** Derives everything the home dashboard needs for the current week from raw rows. */
export const buildWeekSummary = (input: {
  userId: string | null;
  people: GamePerson[];
  recognitions: WeekRecognition[];
  awardVotes: AwardVote[];
  milestones: Milestone[];
  categoriesCount: number;
  votedRocketer: boolean;
  rocketerVoters: number;
  checkinDone: boolean;
  myPersonId?: string | null;
}) => {
  const { userId, people, recognitions, awardVotes, milestones } = input;
  const approved = people.filter((p) => p.approved !== false);
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  const mine = recognitions.filter((r) => r.author_user_id && r.author_user_id === userId);
  const surveyAnswered = new Set(mine.map((r) => r.question_id).filter(Boolean)).size;

  const myAwardVotes = awardVotes.filter((v) => v.voter_user_id === userId).length;
  const milestonesTouched = milestones.filter(
    (m) => m.created_by === userId || (input.myPersonId && m.participants.includes(input.myPersonId)),
  ).length;

  const recognized = new Set([
    ...recognitions.map((r) => r.recognized_person_id),
    ...awardVotes.filter((v) => !v.is_self).map((v) => v.nominee_person_id),
  ]);
  const radar = approved.filter((p) => !recognitions.some((r) => r.recognized_person_id === p.id));

  // XP given per user this week (anonymous recognitions are excluded to keep them anonymous)
  const given: Record<string, number> = {};
  const surveyed = new Set<string>();
  recognitions.forEach((r) => {
    if (!r.author_user_id || r.is_anonymous) return;
    if (r.question_id) {
      if (surveyed.has(r.author_user_id)) return;
      surveyed.add(r.author_user_id);
      given[r.author_user_id] = (given[r.author_user_id] || 0) + XP.completeSurvey;
    } else {
      given[r.author_user_id] = (given[r.author_user_id] || 0) + XP.giveRecognition;
    }
  });
  awardVotes.forEach((v) => (given[v.voter_user_id] = (given[v.voter_user_id] || 0) + XP.castAwardVote));
  milestones.forEach((m) => (given[m.created_by] = (given[m.created_by] || 0) + XP.createMilestone));
  const personByUser = Object.fromEntries(people.filter((p) => p.user_id).map((p) => [p.user_id!, p]));
  const topGivers = Object.entries(given)
    .filter(([uid]) => personByUser[uid])
    .map(([uid, xp]) => ({ person: personByUser[uid], xp }))
    .sort((a, b) => b.xp - a.xp);

  const players = people.filter((p) => p.user_id).length || approved.length || 1;
  const activeUsers = new Set([
    ...recognitions.map((r) => r.author_user_id).filter(Boolean),
    ...awardVotes.map((v) => v.voter_user_id),
  ]).size;

  return {
    peopleById,
    radar,
    topGivers,
    myAwardVotes,
    systems: launchSystems({
      awardVotes: myAwardVotes,
      awardsActive: input.categoriesCount,
      surveyAnswered,
      votedRocketer: input.votedRocketer,
      milestonesTouched,
      checkinDone: input.checkinDone,
    }),
    team: {
      participation: Math.min(1, activeUsers / players),
      coverage: approved.length ? Math.min(1, [...recognized].filter((id) => peopleById[id]).length / approved.length) : 0,
      recognitions: recognitions.length,
      awardVotes: awardVotes.length + input.rocketerVoters,
      milestones: milestones.length,
    },
  };
};

/** Extracts the video id from any common YouTube URL (watch, youtu.be, shorts, embed). */
export const youtubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const m = url.trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};
