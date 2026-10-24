# FASE 1 · PARTE 1 DE 4 — Rocketing Recognitions

**Base de datos:** el primer archivo de esta parte es una migración NUEVA (`supabase/migrations/20261023000000_rocketer_rest.sql`). Aplica SOLO esa migración (es segura de repetir) y no vuelvas a correr las anteriores. Solo cambia la función get_recent_rocketers para que el Rocketer descanse 1 semana en vez de 3.

Crea o reemplaza cada archivo EXACTAMENTE con el contenido indicado (completo, sin resumir ni rediseñar). No toques otros archivos ni el login, y no borres datos.

### Archivo: `supabase/migrations/20261023000000_rocketer_rest.sql`

~~~sql
-- Idempotent: safe to run again on a database where it was already applied.
-- Team feedback: the 3-week Rocketer cooldown felt like it blocked recognition.
-- Now only last week's winner rests (1 week).
CREATE OR REPLACE FUNCTION public.get_recent_rocketers(_week_id UUID)
RETURNS TABLE (person_id UUID, week_start DATE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ref AS (SELECT start_date FROM public.weeks WHERE id = _week_id),
  counts AS (
    SELECT v.week_id, w.start_date, v.voted_person_id, count(*) AS c
    FROM public.votes v
    JOIN public.weeks w ON w.id = v.week_id, ref
    WHERE w.start_date < ref.start_date
      AND w.start_date >= ref.start_date - 7
    GROUP BY v.week_id, w.start_date, v.voted_person_id
  ),
  maxes AS (SELECT week_id, max(c) AS m FROM counts GROUP BY week_id)
  SELECT c.voted_person_id, c.start_date
  FROM counts c JOIN maxes m ON m.week_id = c.week_id AND m.m = c.c
$$;

NOTIFY pgrst, 'reload schema';
~~~

### Archivo: `src/lib/gamification.ts`

~~~ts
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

// Fallback questions when the week has no awards configured. Order matters:
// open with the human questions (help, attitude) to set an empathetic tone.
export const SURVEY_QUESTIONS = [
  {
    id: "ayuda",
    emoji: "🤝",
    short: "Ayuda",
    pillar: "colaboracion",
    question: "¿Quién te ayudó o te salvó el día?",
    statement: "Ayudó al equipo y salvó el día",
    self: "¿Cuánto ayudaste a otros?",
  },
  {
    id: "actitud",
    emoji: "🌞",
    short: "Actitud",
    pillar: "actitud",
    question: "¿Quién contagió buena actitud?",
    statement: "Contagió buena actitud al equipo",
    self: "¿Cómo estuvo tu actitud?",
  },
  {
    id: "cliente",
    emoji: "💬",
    short: "Cliente",
    pillar: "cliente",
    question: "¿Quién brilló con el cliente?",
    statement: "Brilló en la atención al cliente",
    self: "¿Cómo fue tu atención al cliente?",
  },
  {
    id: "a-tiempo",
    emoji: "⏱️",
    short: "A tiempo",
    pillar: "productividad",
    question: "¿Quién entregó todo a tiempo esta semana?",
    statement: "Entregó todo a tiempo esta semana",
    self: "¿Entregaste todo a tiempo?",
  },
  {
    id: "iniciativa",
    emoji: "🚀",
    short: "Iniciativa",
    pillar: "emprendedor",
    question: "¿Quién propuso o resolvió algo sin que se lo pidieran?",
    statement: "Tomó la iniciativa sin que se lo pidieran",
    self: "¿Tomaste iniciativa?",
  },
] as const;

export const questionOf = (id: string | null | undefined) => SURVEY_QUESTIONS.find((q) => q.id === id);

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
  completeSurvey: 40,
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
  id: "recognitions" | "rocketer" | "milestones" | "checkin";
  emoji: string;
  title: string;
  subtitle: string;
  progress: number;
  goal: number;
  xp: number;
  to: string;
  /** bonus system: adds XP but is not needed to launch */
  optional?: boolean;
};

export const launchSystems = (w: {
  surveyAnswered: number;
  categoriesCount: number;
  votedRocketer: boolean;
  milestonesTouched: number;
  checkinDone: boolean;
}): LaunchSystem[] => [
  {
    id: "recognitions",
    emoji: "🏅",
    title: "Recognitions y premios",
    subtitle: `Una encuesta con los ${w.categoriesCount || 5} premios de la semana`,
    progress: w.surveyAnswered > 0 ? 1 : 0,
    goal: 1,
    xp: XP.completeSurvey,
    to: "/recognize",
  },
  { id: "rocketer", emoji: "🚀", title: "Rocketer", subtitle: "Elige al MVP de la semana", progress: w.votedRocketer ? 1 : 0, goal: 1, xp: XP.castRocketerVote, to: "/vote" },
  { id: "checkin", emoji: "🪞", title: "Autoevaluación", subtitle: "¿Cómo te sentiste esta semana?", progress: w.checkinDone ? 1 : 0, goal: 1, xp: XP.selfCheckin, to: "/checkin" },
  { id: "milestones", emoji: "🏁", title: "Hitos", subtitle: "Bonus: registra o súmate a un logro", progress: Math.min(1, w.milestonesTouched), goal: 1, xp: XP.createMilestone, to: "/milestones", optional: true },
];

// -------------------------------------------- survey = the week's awards

export type SurveyQuestion = {
  id: string;
  emoji: string;
  short: string;
  pillar: string;
  question: string;
  description: string;
  statement: string;
  self: string;
};

/** The survey asks one question per award of the week; its winner takes that award. */
const PILLAR_ORDER = ["colaboracion", "actitud", "cliente", "productividad", "resultados", "creatividad", "emprendedor", "crecimiento"];
const pillarRank = (p: string) => (PILLAR_ORDER.indexOf(p) === -1 ? PILLAR_ORDER.length : PILLAR_ORDER.indexOf(p));

export const questionsFromCategories = (categories: AwardCategory[]): SurveyQuestion[] =>
  categories.length
    ? [...categories]
        // human questions first (help, attitude) for an empathetic tone; the team's extra award goes last
        .sort((a, b) => Number(!!a.is_custom) - Number(!!b.is_custom) || pillarRank(a.pillar) - pillarRank(b.pillar))
        .map((c) => ({
        id: c.id,
        emoji: c.emoji,
        short: c.name.length > 14 ? c.name.split(/\s+/).slice(-1)[0] : c.name,
        pillar: c.pillar,
        question: `¿Quién se gana "${c.name}"?`,
        description: c.description,
        statement: `Destacó en "${c.name}"`,
        self: `¿Te ganaste "${c.name}"?`,
      }))
    : SURVEY_QUESTIONS.map((q) => ({ ...q, description: "" }));

/** True when a recognition row only carries the automatic text (no written comment). */
export const isAutoStatement = (message: string | null | undefined) =>
  !message || message.startsWith("Destacó en \"") || SURVEY_QUESTIONS.some((q) => q.statement === message);

// --------------------------------------------------------- award scoring

export type AwardStanding = { personId: string; rockets: number; votes: number; selfRockets: number; reasons: string[] };

/**
 * Standings for one award: survey answers (1–3 🚀 each) + self rating × ½ from
 * the self-evaluation + any legacy drag-and-drop award votes cast this week.
 */
export const categoryStandings = (
  categoryId: string,
  recs: WeekRecognition[],
  awardVotes: AwardVote[] = [],
  checkins: Pick<SelfCheckin, "person_id" | "ratings">[] = [],
): AwardStanding[] => {
  const map = new Map<string, AwardStanding>();
  const get = (id: string) => map.get(id) || { personId: id, rockets: 0, votes: 0, selfRockets: 0, reasons: [] };
  recs.forEach((r) => {
    if (r.question_id !== categoryId) return;
    const s = get(r.recognized_person_id);
    s.rockets += r.rating || 1;
    s.votes += 1;
    if (!isAutoStatement(r.message) && !r.is_anonymous) s.reasons.push(r.message);
    map.set(r.recognized_person_id, s);
  });
  awardVotes.forEach((v) => {
    if (v.category_id !== categoryId) return;
    const s = get(v.nominee_person_id);
    const w = v.is_self ? SELF_WEIGHT : 1;
    s.rockets += v.rockets * w;
    if (v.is_self) s.selfRockets += v.rockets * w;
    else s.votes += 1;
    if (v.reason?.trim() && !v.is_self) s.reasons.push(v.reason.trim());
    map.set(v.nominee_person_id, s);
  });
  checkins.forEach((c) => {
    const rating = c.ratings?.[categoryId];
    if (!c.person_id || !rating) return;
    const s = get(c.person_id);
    s.rockets += rating * SELF_WEIGHT;
    s.selfRockets += rating * SELF_WEIGHT;
    map.set(c.person_id, s);
  });
  return [...map.values()].filter((s) => s.votes > 0 || s.selfRockets > 0).sort((a, b) => b.rockets - a.rockets || b.votes - a.votes);
};

/** Legacy helper kept for the old award votes (all-time stats). */
export const awardStandings = (categoryId: string, votes: AwardVote[]) => categoryStandings(categoryId, [], votes);

export const awardWinners = (categoryId: string, votes: AwardVote[], recs: WeekRecognition[] = []) => {
  const s = categoryStandings(categoryId, recs, votes);
  if (!s.length) return [];
  const top = s[0];
  return s.filter((x) => x.rockets === top.rockets && x.votes === top.votes);
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

/** Short display names: first name, unless two people share it (then the full name). */
export const shortNames = (people: { id: string; name: string }[]) => {
  const count: Record<string, number> = {};
  people.forEach((p) => (count[firstName(p.name)] = (count[firstName(p.name)] || 0) + 1));
  return Object.fromEntries(people.map((p) => [p.id, count[firstName(p.name)] > 1 ? p.name : firstName(p.name)]));
};

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

  const myAwardVotes = mine.filter((r) => r.question_id).length + awardVotes.filter((v) => v.voter_user_id === userId).length;
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
      categoriesCount: input.categoriesCount,
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
~~~

### Archivo: `src/components/game/AwardsAdmin.tsx`

~~~tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePeople, useWeekAwards, useWeekAwardVotes, useWeekCheckins, useWeekRecognitions } from "@/hooks/useGame";
import { AwardCategory, categoryStandings, pillarOf } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import PlayerAvatar from "./PlayerAvatar";

/** Admin: choose which awards are active for a week and see live standings. */
const AwardsAdmin = ({ weekId }: { weekId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: active = [] } = useWeekAwards(weekId, { ensure: false });
  const { data: votes = [] } = useWeekAwardVotes(weekId);
  const { data: recs = [] } = useWeekRecognitions(weekId);
  const { data: checkins = [] } = useWeekCheckins(weekId);
  const { data: people = [] } = usePeople();
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  const { data: catalog = [], error } = useQuery({
    queryKey: ["award-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("award_categories").select("*").order("sort_order");
      if (error) throw error;
      return data as AwardCategory[];
    },
  });

  const activeIds = new Set(active.map((c) => c.id));

  const toggle = async (c: AwardCategory) => {
    const isOn = activeIds.has(c.id);
    if (isOn && (votes.some((v) => v.category_id === c.id) || recs.some((r) => r.question_id === c.id)) && !confirm("Este premio ya tiene votos. ¿Quitarlo de la semana? (los votos se conservan)")) return;
    const { error } = isOn
      ? await supabase.from("week_awards").delete().eq("week_id", weekId).eq("category_id", c.id)
      : await supabase.from("week_awards").insert({ week_id: weekId, category_id: c.id, position: active.length + 1 });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["week-awards", weekId] });
  };

  const autoAssign = async () => {
    const { error } = await supabase.rpc("ensure_week_awards", { _week_id: weekId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["week-awards", weekId] });
  };

  if (error) {
    return (
      <div className="glass-card p-6 text-sm text-muted-foreground">
        Falta aplicar la migración <code>20261016000000_gamification.sql</code> en Supabase.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="hud-label">Premios activos esta semana ({active.length}) · recomendado: 5</p>
          {active.length === 0 && (
            <button onClick={autoAssign} className="text-xs text-accent hover:underline">
              Asignar rotación automática
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalog.map((c) => {
            const on = activeIds.has(c.id);
            const pillar = pillarOf(c.pillar);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c)}
                className={cn(
                  "text-left rounded-xl border p-3 flex gap-3 items-start transition-all",
                  on ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100",
                )}
              >
                <span className="text-2xl">{c.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                  <span className="chip text-[10px] px-2 py-0.5 mt-1" style={{ background: `hsl(${pillar.hue} / 0.15)`, color: `hsl(${pillar.hue})` }}>
                    {pillar.label}
                  </span>
                </div>
                <span className={cn("ml-auto text-xs font-hud", on ? "text-primary" : "text-muted-foreground")}>{on ? "ACTIVO" : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((c) => {
          const standings = categoryStandings(c.id, recs, votes, checkins);
          return (
            <div key={c.id} className="glass-card p-4">
              <p className="font-display text-sm text-gold-gradient mb-3">
                {c.emoji} {c.name}
              </p>
              {standings.length === 0 && <p className="text-xs text-muted-foreground">Sin votos aún</p>}
              <ol className="space-y-2">
                {standings.slice(0, 5).map((s, i) => (
                  <li key={s.personId} className="flex items-center gap-2">
                    <span className={cn("font-display text-xs w-4", i === 0 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                    <PlayerAvatar name={peopleById[s.personId]?.name || "?"} photoUrl={peopleById[s.personId]?.photo_url} size={24} ring="none" />
                    <span className="text-sm flex-1 truncate">{peopleById[s.personId]?.name}</span>
                    <span className="font-hud text-xs">{s.rockets}🚀 · {s.votes}v</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AwardsAdmin;
~~~

### Archivo: `src/components/game/AwardsShowcase.tsx`

~~~tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { AwardCategory, pillarOf, RECOGNITION_PILLARS } from "@/lib/gamification";
import Trophy from "./Trophy";
import GameButton from "./GameButton";

export type ProposeInput = { name: string; description: string; emoji: string; pillar: string };

const CUSTOM_EMOJIS = ["🏅", "🦸", "🧠", "🎯", "🔥", "💎", "🧲", "🛠️", "🎤", "📣", "🧪", "🐐"];

interface AwardsShowcaseProps {
  categories: AwardCategory[];
  /** how many times each award was voted this week (no leader shown: results are revealed on Friday) */
  mentions: Record<string, number>;
  surveyDone: boolean;
  locked?: boolean;
  canPropose?: boolean;
  onPropose?: (a: ProposeInput) => Promise<void>;
  onVote: () => void;
}

/** The week's awards. Voting happens inside the Recognitions survey: one question per award. */
const AwardsShowcase = ({ categories, mentions, surveyDone, locked, canPropose, onPropose, onVote }: AwardsShowcaseProps) => {
  const [proposing, setProposing] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pEmoji, setPEmoji] = useState(CUSTOM_EMOJIS[0]);
  const [pPillar, setPPillar] = useState<string>("actitud");
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  return (
    <div className="space-y-5">
      <EmojiBurst triggerSignal={burst} />

      <div className="cockpit p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="hud-label text-neon">Cómo se ganan</p>
          <p className="text-sm text-foreground/90 mt-1">
            Cada premio es una pregunta de la encuesta de Recognitions. Quien junte más 🚀 en esa pregunta se lo lleva, y se revela el viernes en la
            presentación.
          </p>
        </div>
        <GameButton variant={surveyDone ? "ghost" : "gold"} size="lg" onClick={onVote} disabled={locked}>
          {surveyDone ? "✓ Ya votaste · dar medallas" : "🏅 Votar los premios"}
        </GameButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {categories.map((c, i) => {
          const pillar = pillarOf(c.pillar);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-3 md:p-4 flex flex-col items-center text-center"
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
              <Trophy size={78} emoji={c.emoji} />
              <h3 className="font-display text-[12px] md:text-sm font-bold text-gold-gradient mt-2 leading-tight">{c.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.description}</p>
              <p className="font-hud text-[11px] text-muted-foreground mt-auto pt-2">{mentions[c.id] || 0} votos</p>
            </motion.div>
          );
        })}
        {canPropose && !locked && onPropose && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={() => setProposing(true)}
            className="rounded-2xl border-2 border-dashed border-neon-magenta/60 bg-neon-magenta/5 p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[220px] hover:bg-neon-magenta/10 transition-all"
          >
            <span className="text-5xl">➕</span>
            <span className="font-display text-sm font-bold text-neon-magenta">Proponer premio extra</span>
            <span className="text-[11px] text-muted-foreground">Solo 1 por semana para todo el equipo. ¡El primero que lo cree lo nombra!</span>
          </motion.button>
        )}
      </div>

      <Dialog open={proposing} onOpenChange={setProposing}>
        <DialogContent className="bg-card border-neon-magenta/50 max-w-md">
          <DialogHeader className="items-center text-center">
            <Trophy size={90} emoji={pEmoji} active />
            <DialogTitle className="font-display text-gold-gradient text-lg">{pName || "Nuevo premio"}</DialogTitle>
            <DialogDescription>Crea el premio extra de esta semana. Se agrega como pregunta a la encuesta de todos.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-1.5">
            {CUSTOM_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setPEmoji(e)}
                aria-label={`Emoji ${e}`}
                className={cn("h-10 w-10 rounded-lg text-xl border", pEmoji === e ? "border-primary bg-primary/15" : "border-border bg-muted/30")}
              >
                {e}
              </button>
            ))}
          </div>
          <Input id="award-name" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nombre (ej. El/La Salvavidas del Viernes)" maxLength={40} className="bg-muted/40" />
          <Textarea id="award-description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="¿Qué conducta premia?" maxLength={160} className="bg-muted/40 min-h-[70px]" />
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

export default AwardsShowcase;
~~~

### Archivo: `src/components/game/CheckinsAdmin.tsx`

~~~tsx
import { usePeople, useWeekAwards, useWeekCheckins, useWeekMilestones } from "@/hooks/useGame";
import { moodOf, questionsFromCategories, SpeedId, SPEEDS } from "@/lib/gamification";
import PlayerAvatar from "./PlayerAvatar";
import ClimateMeter from "./ClimateMeter";

const ORDER: SpeedId[] = ["bajo", "crucero", "maximo"];

/** Admin/HR: private view of every self-evaluation (who asked for support and lowest mood first). */
const CheckinsAdmin = ({ weekId }: { weekId: string }) => {
  const { data: checkins = [] } = useWeekCheckins(weekId);
  const { data: people = [] } = usePeople();
  const { data: milestones = [] } = useWeekMilestones(weekId);
  const { data: categories = [] } = useWeekAwards(weekId, { ensure: false });
  const questions = questionsFromCategories(categories);
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const msById = Object.fromEntries(milestones.map((m) => [m.id, m]));
  const pending = people.filter((p) => p.user_id && p.approved !== false && !checkins.some((c) => c.person_id === p.id));
  const sorted = [...checkins].sort(
    (a, b) =>
      Number(!!b.wants_support) - Number(!!a.wants_support) ||
      (a.mood ?? 6) - (b.mood ?? 6) ||
      ORDER.indexOf(a.speed) - ORDER.indexOf(b.speed),
  );
  const moodCounts: Record<number, number> = {};
  checkins.forEach((c) => {
    if (c.mood) moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
  });
  const supportCount = checkins.filter((c) => c.wants_support).length;

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <p className="hud-label mb-3">Clima del equipo (indicador principal)</p>
        <ClimateMeter counts={moodCounts} nudge={false} />
        {supportCount > 0 && (
          <p className="mt-3 text-sm text-accent">🫂 {supportCount} persona{supportCount !== 1 && "s"} pidió que le echen la mano. Aparecen primero abajo.</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {ORDER.map((id) => (
          <div key={id} className="glass-card p-4 text-center">
            <p className="text-2xl">{SPEEDS[id].emoji}</p>
            <p className="font-display text-2xl" style={{ color: `hsl(${SPEEDS[id].hue})` }}>
              {checkins.filter((c) => c.speed === id).length}
            </p>
            <p className="hud-label">{SPEEDS[id].label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4">
          <p className="hud-label mb-2">Sin autoevaluación ({pending.length})</p>
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-muted/50 pl-0.5 pr-2.5 py-0.5 text-xs">
                <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={20} ring="none" /> {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {sorted.map((c) => {
        const p = c.person_id ? byId[c.person_id] : null;
        const sp = SPEEDS[c.speed];
        const mood = moodOf(c.mood);
        return (
          <div key={c.id} className="glass-card p-4 flex gap-4" style={{ borderLeft: `4px solid hsl(${(mood ?? sp).hue})` }}>
            <PlayerAvatar name={p?.name || "?"} photoUrl={p?.photo_url} size={44} ring="none" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p?.name || "Usuario sin persona vinculada"}</p>
                {mood && (
                  <span className="chip text-sm" style={{ background: `hsl(${mood.hue} / 0.15)`, color: `hsl(${mood.hue})` }}>
                    {mood.emoji} {mood.label}
                  </span>
                )}
                <span className="chip" style={{ background: `hsl(${sp.hue} / 0.15)`, color: `hsl(${sp.hue})` }}>
                  {sp.emoji} {sp.label}
                </span>
                {c.wants_support && <span className="chip bg-accent/20 text-accent">🫂 Pidió apoyo</span>}
              </div>
              <p className="text-sm text-foreground/90">
                <span className="text-muted-foreground">{sp.prompt.replace("…", "")}</span> {c.reason}
              </p>
              {c.blockers?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.blockers.map((b) => (
                    <span key={b} className="chip bg-destructive/15 text-destructive text-[11px]">
                      {b}
                    </span>
                  ))}
                </div>
              )}
              {c.next_step && <p className="text-xs text-accent">➜ {c.next_step}</p>}
              {c.milestone_ids?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  🏁 {c.milestone_ids.map((id) => msById[id]?.title).filter(Boolean).join(" · ")}
                </p>
              )}
              {Object.keys(c.ratings || {}).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Auto (vale ½):{" "}
                  {questions.filter((q) => c.ratings[q.id]).map((q) => `${q.emoji}${"🚀".repeat(c.ratings[q.id])}`).join("  ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {checkins.length === 0 && <p className="text-sm text-muted-foreground">Nadie ha enviado su autoevaluación esta semana.</p>}
    </div>
  );
};

export default CheckinsAdmin;
~~~

### Archivo: `src/components/game/DragPeople.tsx`

~~~tsx
import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { firstName, GamePerson, shortNames } from "@/lib/gamification";
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

export type TokenState = {
  disabled?: boolean;
  badge?: string;
  hint?: string;
  highlight?: boolean;
  done?: boolean;
};

interface DraggablePersonProps {
  person: GamePerson;
  /** display name (defaults to the first name) */
  label?: string;
  size?: number;
  selected?: boolean;
  state?: TokenState;
  onHover: (zone: string | null) => void;
  onDrop: (personId: string, zone: string) => void;
  onSelect: (personId: string) => void;
}

export const DraggablePerson = ({
  person,
  label,
  size = 60,
  selected,
  state,
  onHover,
  onDrop,
  onSelect,
}: DraggablePersonProps) => {
  const disabled = !!state?.disabled;
  // framer can emit a tap at the end of a drag; ignore it
  const dragged = useRef(false);
  return (
    <div
      className="flex flex-col items-center gap-1 w-[76px]"
      title={state?.hint}
    >
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
          selected &&
            "ring-4 ring-primary ring-offset-2 ring-offset-background",
        )}
        style={{ zIndex: 1 }}
        aria-label={`Arrastra a ${person.name}`}
        aria-pressed={selected}
      >
        <PlayerAvatar
          name={person.name}
          photoUrl={person.photo_url}
          size={size}
          ring={
            selected || state?.done
              ? "gold"
              : state?.highlight
                ? "cyan"
                : "none"
          }
          className={cn(
            !state?.highlight && !selected && !state?.done && "opacity-80",
          )}
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
          state?.highlight
            ? "text-accent font-semibold"
            : "text-muted-foreground",
        )}
      >
        {label ?? firstName(person.name)}
      </span>
      {state?.highlight && (
        <span className="font-hud text-[9px] font-semibold rounded bg-accent/20 text-accent px-1.5 leading-4">
          Aún sin recog.
        </span>
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

export const PeopleTray = ({
  people,
  selectedId,
  stateFor,
  onHover,
  onDrop,
  onSelect,
  title,
  className,
}: PeopleTrayProps) => {
  const labels = shortNames(people);
  return (
    <div className={cn("glass-card relative z-30 p-4", className)}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="hud-label">{title ?? "Tripulación"}</span>
        <span className="text-xs text-muted-foreground">
          {selectedId
            ? "Ahora toca un trofeo 🏆"
            : "Arrastra una foto al trofeo · o tócala"}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
        {people.map((p) => (
          <DraggablePerson
            key={p.id}
            person={p}
            label={labels[p.id]}
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
};
~~~

### Archivo: `src/components/game/GameShell.tsx`

~~~tsx
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
~~~

