# GRUPOS · PARTE 1 DE 2 — Rocketing Recognitions

**Base de datos:** el primer archivo es una migración NUEVA (`supabase/migrations/20261024000000_people_groups.sql`). Aplica SOLO esa (es segura de repetir). Asigna el grupo de cada persona por su id (equipo Rocketing, externos, Idearia, modo diversión, otros) y aprueba a Giselle. No vuelvas a correr las migraciones anteriores.

Crea o reemplaza cada archivo EXACTAMENTE con el contenido indicado (completo, sin resumir ni rediseñar). No toques otros archivos ni el login, y no borres datos.

### Archivo: `supabase/migrations/20261024000000_people_groups.sql`

~~~sql
-- Idempotent: safe to run again on a database where it was already applied.
-- People groups so the Rocketing team always shows first and gets remembered:
--   team       = Equipo Rocketing (can win awards and Rocketer)
--   proveedor  = Rocketing externos (awards yes, Rocketer no)
--   idearia    = Idearia, sister company (awards yes, Rocketer no)
--   diversion  = fun entries: pets, AI agents, gadgets (awards yes, Rocketer no)
--   otro       = everything else, listed last
-- Assignments use the exact ids from the people export of 2026-10-19.

ALTER TABLE public.people DROP CONSTRAINT IF EXISTS people_type_check;
ALTER TABLE public.people
  ADD CONSTRAINT people_type_check CHECK (type IN ('team', 'proveedor', 'idearia', 'diversion', 'otro'));

-- Equipo Rocketing (Giselle was still pending approval)
UPDATE public.people SET type = 'team' WHERE id IN (
  'bf8b2d1f-f2b7-401e-a17d-3ece62ef9ef2', -- Zei
  '3c845232-97ee-452c-aa2d-a1909c2a4d2c', -- Robert
  'f9465708-0fa3-4adc-a633-f78b85d9b9ac', -- René
  '7a49efff-a1ec-4e98-9495-5cbcb947c53e', -- Marily
  '493a7688-e5de-45a9-964b-2f81e1394b0c', -- Jose
  '9f5373e9-eaf0-449a-a574-f7c4f97a82c4', -- Jerry
  'db7098dd-5361-4a0f-a4d3-67495a369fb2', -- Giselle
  '8deecadd-ce2f-4d65-950a-6d703652a3c2', -- Dianita
  '69e689a7-f84a-4b88-b1a3-833bbcfd0b6d', -- Dani
  '7a1c2543-e58e-4372-b130-6b8b9e57a03d'  -- Axel
);
UPDATE public.people SET approved = true WHERE id = 'db7098dd-5361-4a0f-a4d3-67495a369fb2'; -- Giselle

-- Rocketing externos
UPDATE public.people SET type = 'proveedor' WHERE id IN (
  'afe6a5cd-f176-46b8-8c94-4e36c4fd29e3', -- Oliver Cortes
  '0ddcfd30-2487-42a5-add0-796be019778f', -- Andy
  '19c5af05-1f36-457a-acb5-fcb3fdeceed8', -- Dani Diseñador
  'a15428e2-66db-4a4c-8fb9-cdc2691b3fc9', -- Jenn
  '65d7725f-7bf7-4bce-9bf8-dc57e27c1576'  -- Dulce
);

-- Idearia
UPDATE public.people SET type = 'idearia' WHERE id IN (
  '00274a25-613e-47fe-8797-c09307d33831', -- Albertico
  'db533c3e-6e33-48e4-8b72-bd027701f7da', -- Edgar
  '894e11d9-7e14-4da4-9d60-3dc657f6d935'  -- Ildris
);

-- Modo diversión
UPDATE public.people SET type = 'diversion' WHERE id IN (
  '40877df4-4048-4f0e-8661-3f1936f22769', -- Ayro (perrito de Dani)
  '2fcd85bc-338f-46ff-83bd-4b396360700f', -- Rufino (agente IA)
  '7bd8c873-76dd-4ebf-9958-2aa3a3020a22'  -- Trilogy
);

-- Otros (compiten, siempre al final de la lista)
UPDATE public.people SET type = 'otro' WHERE id IN (
  '6cf33820-692f-441e-9d34-b5d1cd57162f', -- Team Rocketing
  '81d48a67-9c13-4806-856f-36e14cc712f9', -- Fabián
  '4a3a1a6b-68ae-4737-9bad-e9dd9839d6be', -- Jess
  'c9888166-1577-4f41-b1b1-52b785d5a6bd', -- México
  '608cfbb8-3d16-4857-8f19-bc96af573ed0', -- BluePixel
  '8e579396-d239-402c-8329-b2099d0c2e48'  -- Alex Diseñador
);

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
  /** group: team | proveedor | idearia | diversion | otro */
  type?: string;
  created_at?: string;
};

// ------------------------------------------------------------------ groups

export const GROUPS: Record<string, { label: string; emoji: string; order: number }> = {
  team: { label: "Equipo Rocketing", emoji: "🚀", order: 0 },
  proveedor: { label: "Rocketing externos", emoji: "🤝", order: 1 },
  idearia: { label: "Idearia", emoji: "💡", order: 2 },
  diversion: { label: "Modo diversión", emoji: "🐾", order: 3 },
  otro: { label: "Otros", emoji: "✨", order: 4 },
};

export const groupOf = (p: Pick<GamePerson, "type">) => GROUPS[p.type || "team"] ?? GROUPS.otro;

/** The Rocketing team: always listed first, the only group eligible for Rocketer. */
export const isCore = (p: Pick<GamePerson, "type">) => (p.type || "team") === "team";

/** Added in the last 7 days (shows a "Nuevo" tag). */
export const isRecent = (p: Pick<GamePerson, "created_at">, now = Date.now()) =>
  !!p.created_at && now - new Date(p.created_at).getTime() < 7 * 86400000;

/**
 * Order for every people list: the Rocketing team first in a random order
 * (so nobody is always first or forgotten at the bottom), then the other
 * groups in their fixed order, alphabetically.
 */
export const orderPeople = <T extends GamePerson>(people: T[], seed: number): T[] => {
  // well-mixed hash of (seed, id) so similar ids still land in unrelated positions
  const rank = (p: T) => {
    let h = (seed ^ 0x9e3779b9) >>> 0;
    for (let i = 0; i < p.id.length; i++) {
      h = Math.imul(h ^ p.id.charCodeAt(i), 0x85ebca6b);
      h ^= h >>> 13;
    }
    h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  };
  return [...people].sort((a, b) => {
    const ga = groupOf(a).order;
    const gb = groupOf(b).order;
    if (ga !== gb) return ga - gb;
    if (ga === 0) return rank(a) - rank(b);
    return a.name.localeCompare(b.name);
  });
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
  // after Friday the week stays open until the new one starts on Monday
  return { ms, d, h, m, label: ms === 0 ? "Abre lunes" : d > 0 ? `${d}d ${h}h` : `${h}h ${m}m` };
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
  // Radar and coverage look at the Rocketing team: the people others tend to forget
  const core = approved.filter(isCore);
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
  const radar = core.filter((p) => !recognitions.some((r) => r.recognized_person_id === p.id));

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
      coverage: core.length ? Math.min(1, core.filter((p) => recognized.has(p.id)).length / core.length) : 0,
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

### Archivo: `src/components/game/RecognitionSurvey.tsx`

~~~tsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, MessageSquarePlus, Plus, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import EmojiBurst from "@/components/EmojiBurst";
import { cn } from "@/lib/utils";
import { GamePerson, groupOf, isCore, orderPeople, pillarOf, RATING_LABELS, RECOGNITION_PILLARS, shortNames, SurveyQuestion, XP } from "@/lib/gamification";
import Medal from "./Medal";
import PlayerAvatar from "./PlayerAvatar";
import GameButton from "./GameButton";
import { DraggablePerson } from "./DragPeople";

export type SurveyAnswer = { questionId: string; personId: string; rating: number; comment: string };
export type SurveyExtra = { personId: string; pillar: string; message: string };
export type SurveySubmission = { answers: SurveyAnswer[]; extras: SurveyExtra[]; anonymous: boolean };

interface RecognitionSurveyProps {
  people: GamePerson[];
  myUserId: string | null;
  /** one question per award of the week */
  questions: SurveyQuestion[];
  /** people nobody has recognized this week */
  radarIds: Set<string>;
  /** people added this session (shown with a "Nuevo" tag) */
  newPersonIds?: Set<string>;
  /** a person just added: selected in the current question */
  autoSelectId?: string | null;
  /** survey already sent this week → open on the free medals */
  alreadyDone?: boolean;
  initialPersonId?: string | null;
  onAddPerson?: () => void;
  onSubmit: (s: SurveySubmission) => Promise<void>;
  onFinish?: () => void;
}

type Pick = { rating: number; comment: string; showComment?: boolean };
const MEDAL_ZONE = "extra-medal";

const RocketRating = ({ value, onChange, size = "md" }: { value: number; onChange: (v: number) => void; size?: "md" | "lg" }) => (
  <div className="flex gap-1">
    {[1, 2, 3].map((n) => (
      <motion.button
        key={n}
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          onChange(n);
        }}
        aria-label={`${n} ${n === 1 ? "cohete" : "cohetes"}: ${RATING_LABELS[n]}`}
        className={cn(
          "rounded-lg border flex items-center justify-center transition-all",
          size === "lg" ? "h-11 px-3 text-base" : "h-9 w-9 text-base",
          n <= value ? "border-primary/70 bg-primary/20 shadow-[0_0_12px_hsl(var(--star-gold)/0.4)]" : "border-border bg-muted/40 grayscale opacity-50",
        )}
      >
        {size === "lg" ? "🚀".repeat(n) : "🚀"}
      </motion.button>
    ))}
  </div>
);

const RecognitionSurvey = ({
  people,
  myUserId,
  questions,
  radarIds,
  newPersonIds,
  autoSelectId,
  alreadyDone,
  initialPersonId,
  onAddPerson,
  onSubmit,
  onFinish,
}: RecognitionSurveyProps) => {
  const EXTRA_STEP = questions.length;
  const REVIEW_STEP = questions.length + 1;
  const [step, setStep] = useState(alreadyDone || initialPersonId ? EXTRA_STEP : 0);
  const [answers, setAnswers] = useState<Record<string, Record<string, Pick>>>({});
  const [extras, setExtras] = useState<SurveyExtra[]>([]);
  const [extraPerson, setExtraPerson] = useState<string | null>(initialPersonId ?? null);
  const [extraPillar, setExtraPillar] = useState("");
  const [extraMessage, setExtraMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);

  // Random order for the Rocketing team, fixed for this visit (nobody is always first or last)
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const crew = useMemo(() => {
    const ordered = orderPeople(
      people.filter((p) => !(myUserId && p.user_id === myUserId)),
      seed,
    );
    // someone just added from "+ Agregar integrante" goes first so you see it selected
    const added = ordered.find((p) => p.id === autoSelectId);
    return added ? [added, ...ordered.filter((p) => p.id !== autoSelectId)] : ordered;
  }, [people, myUserId, seed, autoSelectId]);
  const teamCount = crew.filter(isCore).length;
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const labels = useMemo(() => shortNames(crew), [crew]);
  const radarCount = crew.filter((p) => radarIds.has(p.id)).length;
  // At the start of the week everybody is "missing": highlighting all of them means nothing.
  const radarMeaningful = radarCount > 0 && radarCount <= Math.ceil(crew.length / 2);

  const q = questions[step];
  const current = (q && answers[q.id]) || {};
  const selectedIds = Object.keys(current);
  const ratedAnywhere = useMemo(() => new Set(Object.values(answers).flatMap((a) => Object.keys(a))), [answers]);

  const setPick = (personId: string, pick: Pick | null) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      if (pick === null) delete qa[personId];
      else qa[personId] = pick;
      return { ...all, [q.id]: qa };
    });
  };

  // A person added from "+ Agregar integrante" lands selected in the current question
  useEffect(() => {
    if (!autoSelectId) return;
    if (step < EXTRA_STEP) setPick(autoSelectId, { rating: 2, comment: "" });
    else setExtraPerson(autoSelectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectId]);

  const toggle = (personId: string) => (current[personId] ? setPick(personId, null) : setPick(personId, { rating: 2, comment: "" }));

  const bulkRate = (rating: number) => {
    if (!q) return;
    setAnswers((all) => {
      const qa = { ...(all[q.id] || {}) };
      Object.keys(qa).forEach((id) => (qa[id] = { ...qa[id], rating }));
      return { ...all, [q.id]: qa };
    });
  };

  const selectRadar = () => crew.filter((p) => radarIds.has(p.id) && !current[p.id]).forEach((p) => setPick(p.id, { rating: 2, comment: "" }));

  const onSwipe = (personId: string, info: PanInfo) => {
    if (info.offset.x > 70 && !current[personId]) setPick(personId, { rating: 2, comment: "" });
    if (info.offset.x < -70 && current[personId]) setPick(personId, null);
  };

  const flatAnswers: SurveyAnswer[] = Object.entries(answers).flatMap(([questionId, qa]) =>
    Object.entries(qa).map(([personId, p]) => ({ questionId, personId, rating: p.rating, comment: p.comment.trim() })),
  );
  const draftValid = !!extraPerson && !!extraPillar && extraMessage.trim().length >= 10;
  const allExtras = draftValid ? [...extras, { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() }] : extras;
  const canSubmit = flatAnswers.length > 0 || allExtras.length > 0;

  // People tend to forget Rocketers they "don't work with" even though they hear them in the daily
  const recognizedTeam = useMemo(
    () => new Set([...flatAnswers.map((a) => a.personId), ...allExtras.map((x) => x.personId)].filter((id) => byId[id] && isCore(byId[id]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, extras, extraPerson, extraPillar, extraMessage, byId],
  );
  const dailyNudge = crew.filter((p) => isCore(p) && !recognizedTeam.has(p.id)).slice(0, 4);

  const addMedal = () => {
    if (!draftValid) return;
    setExtras((l) => [...l, { personId: extraPerson!, pillar: extraPillar, message: extraMessage.trim() }]);
    setExtraPerson(null);
    setExtraPillar("");
    setExtraMessage("");
    setBurst((b) => b + 1);
  };

  const submit = async () => {
    setSending(true);
    try {
      await onSubmit({ answers: flatAnswers, extras: allExtras, anonymous });
      setDone(true);
      setBurst((b) => b + 1);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setExtras([]);
    setExtraPerson(null);
    setExtraPillar("");
    setExtraMessage("");
    setStep(EXTRA_STEP);
    setDone(false);
  };

  // ---------------------------------------------------------------- done
  if (done) {
    return (
      <div className="cockpit p-8 md:p-12 flex flex-col items-center text-center gap-4">
        <EmojiBurst triggerSignal={burst} count={30} />
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
          <Medal size={140} emoji="✓" active />
        </motion.div>
        <h2 className="font-display text-2xl md:text-3xl font-black text-gold-gradient">¡Recognitions enviados!</h2>
        <p className="text-muted-foreground max-w-md">
          {flatAnswers.length > 0 && `${flatAnswers.length} ${flatAnswers.length === 1 ? "voto" : "votos"} en los premios de la semana. `}
          {allExtras.length > 0 && `${allExtras.length} medalla${allExtras.length !== 1 ? "s" : ""} extra. `}
          Sistema de Recognitions en verde 🟢
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <GameButton variant="gold" onClick={onFinish}>
            🚀 Volver a la nave
          </GameButton>
          <GameButton variant="ghost" onClick={reset}>
            🏅 Dar más medallas
          </GameButton>
        </div>
      </div>
    );
  }

  const steps = [
    ...questions.map((x) => ({ emoji: x.emoji, label: x.short })),
    { emoji: "🏅", label: "Medallas" },
    { emoji: "✅", label: "Enviar" },
  ];

  const AnonToggle = (
    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 pl-3 pr-2 py-1.5 cursor-pointer select-none">
      <span className="text-sm">{anonymous ? "🕶️ Anónimo" : "🙋 Con mi nombre"}</span>
      <Switch checked={anonymous} onCheckedChange={setAnonymous} aria-label="Enviar como anónimo" />
    </label>
  );

  return (
    <div className="space-y-4">
      <EmojiBurst triggerSignal={burst} />

      {/* Steps + anonymous mode, always on top so the question is in view right away */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-stretch gap-1.5 flex-1 overflow-x-auto pb-1" role="tablist" aria-label="Pasos de la encuesta">
          {steps.map((s, i) => {
            const answered = i < EXTRA_STEP && Object.keys(answers[questions[i]?.id] || {}).length > 0;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={i === step}
                aria-label={`Paso ${i + 1}: ${s.label}${answered ? " (contestado)" : ""}`}
                onClick={() => setStep(i)}
                className={cn(
                  "min-w-[56px] flex-1 rounded-lg border px-1 py-1.5 flex flex-col items-center justify-center transition-all",
                  i === step ? "border-primary bg-primary/20 shadow-[0_0_16px_hsl(var(--star-gold)/0.4)]" : answered ? "border-xp/50 bg-xp/10" : "border-border/60 bg-muted/30 opacity-70",
                )}
              >
                <span className="text-base leading-none">{answered && i !== step ? "✓" : s.emoji}</span>
                <span className="font-hud text-[10px] leading-tight mt-0.5 truncate max-w-full">{s.label}</span>
              </button>
            );
          })}
        </div>
        {step !== REVIEW_STEP && <div className="shrink-0">{AnonToggle}</div>}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
          {/* ------------------------------------------------ award questions */}
          {q && (
            <div className="cockpit p-4 md:p-6">
              <p className="hud-label text-neon">
                Premio {step + 1} de {questions.length} ·{" "}
                <span style={{ color: `hsl(${pillarOf(q.pillar).hue})` }}>{pillarOf(q.pillar).label}</span>
              </p>
              <h2 className="font-display text-xl md:text-3xl font-black text-foreground mt-1 text-balance">
                {q.emoji} {q.question}
              </h2>
              {q.description && <p className="text-sm text-foreground/80 mt-1">{q.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Toca o desliza → a quien se lo ganó y califica: 🚀 bien · 🚀🚀 muy bien · 🚀🚀🚀 épico. Puedes elegir a varios.
              </p>

              <div className="flex flex-wrap gap-2 mt-3 mb-3">
                {onAddPerson && (
                  <button onClick={onAddPerson} className="chip border border-primary/50 text-primary hover:bg-primary/10 px-3 py-2">
                    <UserPlus className="h-3.5 w-3.5" /> Agregar integrante
                  </button>
                )}
                {radarMeaningful && (
                  <button onClick={selectRadar} className="chip border border-accent/50 text-accent hover:bg-accent/10 px-3 py-2">
                    📡 Elegir a quienes aún no tienen recognition ({radarCount})
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: {} }))} className="chip border border-border text-muted-foreground px-3 py-2">
                    Limpiar
                  </button>
                )}
              </div>

              <AnimatePresence>
                {selectedIds.length >= 2 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sticky top-16 z-20 mb-3">
                    <div className="rounded-xl border border-primary/50 bg-background/90 backdrop-blur px-3 py-2 flex flex-wrap items-center gap-3">
                      <span className="font-hud text-sm">
                        Calificar a los <strong className="text-primary">{selectedIds.length}</strong> seleccionados:
                      </span>
                      <RocketRating size="lg" value={0} onChange={bulkRate} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {crew.map((p, i) => {
                  const pick = current[p.id];
                  const radar = radarMeaningful && radarIds.has(p.id) && !ratedAnywhere.has(p.id);
                  const isNew = !!newPersonIds?.has(p.id);
                  const justAdded = p.id === autoSelectId;
                  const group = groupOf(p);
                  const prev = crew[i - 1];
                  const sectionLabel = justAdded
                    ? "👋 Recién agregado"
                    : !prev || prev.id === autoSelectId || groupOf(prev).label !== group.label
                      ? `${group.emoji} ${group.label}${isCore(p) ? ` (${teamCount})` : ""}`
                      : null;
                  return (
                    <Fragment key={p.id}>
                    {sectionLabel && <p className={cn("hud-label pb-1", i > 0 && "pt-4", isCore(p) && !justAdded && "text-primary")}>{sectionLabel}</p>}
                    <div className="relative rounded-xl overflow-hidden">
                      <div aria-hidden className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-xp/40 via-xp/10 to-destructive/30">
                        <span className="font-hud text-xs font-bold text-xp">✓ ELEGIR →</span>
                        <span className="font-hud text-xs font-bold text-destructive">← QUITAR</span>
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.5}
                        onDragEnd={(_, info) => onSwipe(p.id, info)}
                        onClick={() => toggle(p.id)}
                        role="checkbox"
                        aria-checked={!!pick}
                        aria-label={`${p.name}${pick ? `, ${RATING_LABELS[pick.rating]}` : ""}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggle(p.id);
                          }
                        }}
                        className={cn(
                          "relative flex flex-wrap items-center gap-3 px-3 py-2.5 cursor-pointer border rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          pick ? "bg-[hsl(256_40%_14%)] border-primary/60" : radar ? "bg-[hsl(256_40%_10%)] border-accent/40" : "bg-[hsl(256_40%_9%)] border-border/50",
                        )}
                        style={{ touchAction: "pan-y" }}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0",
                            pick ? "border-primary bg-primary text-primary-foreground" : "border-primary/60",
                          )}
                        >
                          {pick && <Check className="h-4 w-4" />}
                        </span>
                        <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={44} ring={pick ? "gold" : radar ? "cyan" : "none"} />
                        <div className="flex-1 min-w-[120px]">
                          <p className="font-semibold leading-tight">
                            {p.name}
                            {isNew && <span className="chip bg-primary/20 text-primary text-[10px] px-2 py-0 ml-2 align-middle">Nuevo</span>}
                          </p>
                          {pick ? (
                            <p className="font-hud text-[11px] text-primary">{RATING_LABELS[pick.rating]}</p>
                          ) : (
                            radar && <p className="text-[11px] text-accent">📡 Aún sin recognition esta semana</p>
                          )}
                        </div>
                        {pick && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <RocketRating value={pick.rating} onChange={(r) => setPick(p.id, { ...pick, rating: r })} />
                            <button
                              onClick={() => setPick(p.id, { ...pick, showComment: !pick.showComment })}
                              className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", pick.comment ? "border-accent text-accent" : "border-border text-muted-foreground")}
                              aria-label={`Agregar comentario para ${p.name}`}
                            >
                              <MessageSquarePlus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {pick?.showComment && (
                          <div className="basis-full" onClick={(e) => e.stopPropagation()}>
                            <Input
                              autoFocus
                              value={pick.comment}
                              onChange={(e) => setPick(p.id, { ...pick, comment: e.target.value })}
                              placeholder={`¿Qué hizo ${labels[p.id] || p.name}? (opcional)`}
                              maxLength={200}
                              className="bg-muted/40 h-10"
                            />
                          </div>
                        )}
                      </motion.div>
                    </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------ free medals (unlimited) */}
          {step === EXTRA_STEP && (
            <div className="space-y-4">
              <div className="cockpit p-4 relative z-30 select-none">
                {dailyNudge.length > 0 && (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 mb-4">
                    <p className="text-sm font-semibold">🎙️ Lo que escuchaste en la daily</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aunque no trabajes directo con ellos, los escuchas cada día. ¿Qué estuvieron haciendo esta semana?
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dailyNudge.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setExtraPerson(p.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border pl-0.5 pr-3 py-0.5 text-xs transition-colors",
                            extraPerson === p.id ? "border-primary bg-primary/20" : "border-border bg-muted/40 hover:border-primary/60",
                          )}
                        >
                          <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={24} ring="none" />
                          {labels[p.id] || p.name} · dar medalla
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="hud-label text-foreground/80">Medallas libres · reconoce por lo que tú quieras</span>
                  <span className="text-xs text-muted-foreground">Arrastra una foto a la medalla o tócala</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
                  {crew.map((p) => (
                    <DraggablePerson
                      key={p.id}
                      person={p}
                      label={labels[p.id]}
                      size={44}
                      selected={extraPerson === p.id}
                      state={{ done: extras.some((x) => x.personId === p.id) || ratedAnywhere.has(p.id), badge: newPersonIds?.has(p.id) ? "Nuevo" : undefined }}
                      onHover={setHover}
                      onDrop={(pid, zone) => zone === MEDAL_ZONE && setExtraPerson(pid)}
                      onSelect={(pid) => setExtraPerson(pid)}
                    />
                  ))}
                  {onAddPerson && (
                    <button onClick={onAddPerson} className="flex flex-col items-center gap-1 w-[76px]" aria-label="Agregar integrante">
                      <span className="h-11 w-11 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center text-primary">
                        <Plus className="h-5 w-5" />
                      </span>
                      <span className="text-[11px] text-primary">Agregar</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
                <div
                  data-dropzone={MEDAL_ZONE}
                  className={cn(
                    "cockpit p-6 flex flex-col items-center justify-center min-h-[300px] transition-shadow",
                    hover === MEDAL_ZONE && "shadow-[0_0_0_2px_hsl(var(--star-gold)/0.7),0_0_50px_hsl(var(--star-gold)/0.4)]",
                  )}
                >
                  <div className="relative">
                    <Medal size={120} active={hover === MEDAL_ZONE || !!extraPerson} emoji={extraPerson ? "" : "★"} />
                    <AnimatePresence>
                      {extraPerson && byId[extraPerson] && (
                        <motion.div
                          key={extraPerson}
                          initial={{ scale: 0, y: -60 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 14 }}
                          className="absolute left-1/2 -translate-x-1/2"
                          style={{ top: 120 * 1.4 * 0.68 - 32 }}
                        >
                          <PlayerAvatar name={byId[extraPerson].name} photoUrl={byId[extraPerson].photo_url} size={64} ring="gold" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="font-display text-lg text-gold-gradient mt-2 text-center">
                    {extraPerson ? byId[extraPerson]?.name : "Elige a alguien"}
                  </p>
                  {extraPerson && (
                    <button onClick={() => setExtraPerson(null)} className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" /> Quitar
                    </button>
                  )}
                </div>
                <div className={cn("cockpit p-5 space-y-4", !extraPerson && "opacity-50 pointer-events-none")}>
                  <p className="text-sm text-muted-foreground">
                    ¿Algo que no cabe en los premios? Dale una medalla con tu propio mensaje. Puedes dar todas las que quieras.{" "}
                    <span className="text-xp">+{XP.giveRecognition} XP c/u</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RECOGNITION_PILLARS.map((id) => {
                      const pm = pillarOf(id);
                      const on = extraPillar === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setExtraPillar(id)}
                          className={cn("rounded-xl border px-3 py-2 text-left text-xs font-hud font-semibold transition-all", on ? "" : "border-border/60 bg-muted/30")}
                          style={on ? { borderColor: `hsl(${pm.hue})`, background: `hsl(${pm.hue} / 0.15)`, color: `hsl(${pm.hue})` } : undefined}
                        >
                          <span className="text-lg mr-1">{pm.emoji}</span> {pm.label}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    value={extraMessage}
                    onChange={(e) => setExtraMessage(e.target.value)}
                    placeholder="Sé concreto: qué hizo, para qué cliente, qué resultado…"
                    maxLength={400}
                    className="min-h-[100px] bg-muted/40"
                  />
                  <GameButton variant="cyan" size="md" className="w-full" disabled={!draftValid} onClick={addMedal}>
                    <Plus className="h-4 w-4" /> Agregar esta medalla
                  </GameButton>
                </div>
              </div>

              {extras.length > 0 && (
                <div className="cockpit p-4">
                  <p className="hud-label mb-2">Medallas listas para enviar ({extras.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {extras.map((x, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-0.5 pr-1.5 py-0.5">
                        <PlayerAvatar name={byId[x.personId]?.name || "?"} photoUrl={byId[x.personId]?.photo_url} size={22} ring="none" />
                        <span className="text-xs">{labels[x.personId] || byId[x.personId]?.name}</span>
                        <span className="text-xs">{pillarOf(x.pillar).emoji}</span>
                        <button onClick={() => setExtras((l) => l.filter((_, j) => j !== i))} aria-label="Quitar medalla" className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------ review */}
          {step === REVIEW_STEP && (
            <div className="cockpit p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl md:text-2xl font-black text-gold-gradient">Revisión antes de despegar</h2>
                {AnonToggle}
              </div>
              {recognizedTeam.size === 0 && dailyNudge.length > 0 && (
                <div className="rounded-xl border border-primary/50 bg-primary/10 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm flex-1">
                    🚀 Todavía no reconoces a nadie del <strong>equipo Rocketing</strong>. Piensa en las dailys: ¿qué hicieron{" "}
                    {dailyNudge.slice(0, 3).map((p) => labels[p.id] || p.name).join(", ")}?
                  </p>
                  <GameButton variant="gold" size="md" onClick={() => setStep(EXTRA_STEP)}>
                    🏅 Dar una medalla
                  </GameButton>
                </div>
              )}
              {questions.map((qq, i) => {
                const qa = answers[qq.id] || {};
                const ids = Object.keys(qa);
                return (
                  <button key={qq.id} onClick={() => setStep(i)} className="w-full text-left rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/50">
                    <p className="text-sm font-semibold">
                      {qq.emoji} {qq.question}
                    </p>
                    {ids.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">Nadie seleccionado</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ids.map((id) => (
                          <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-0.5 pr-2.5 py-0.5">
                            <PlayerAvatar name={byId[id]?.name || "?"} photoUrl={byId[id]?.photo_url} size={22} ring="none" />
                            <span className="text-xs">{labels[id] || byId[id]?.name}</span>
                            <span className="text-[10px]">{"🚀".repeat(qa[id].rating)}</span>
                            {qa[id].comment && <span className="text-[10px]">💬</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              <button onClick={() => setStep(EXTRA_STEP)} className="w-full text-left rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/50">
                <p className="text-sm font-semibold">🏅 Medallas libres</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {allExtras.length ? allExtras.map((x) => labels[x.personId] || byId[x.personId]?.name).join(", ") : "Sin medallas (opcional)"}
                </p>
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-20 lg:bottom-4 z-30 flex items-center gap-3">
        {step > 0 && (
          <GameButton variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} className="shrink-0" aria-label="Atrás">
            <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Atrás</span>
          </GameButton>
        )}
        {step < REVIEW_STEP ? (
          <GameButton variant={step < EXTRA_STEP && selectedIds.length === 0 ? "ghost" : "cyan"} size="lg" className="flex-1" onClick={() => setStep((s) => s + 1)}>
            {step < EXTRA_STEP
              ? selectedIds.length === 0
                ? "Nadie esta vez"
                : `Siguiente · ${selectedIds.length} elegido${selectedIds.length !== 1 ? "s" : ""}`
              : "Revisar y enviar"}
            <ChevronRight className="h-5 w-5" />
          </GameButton>
        ) : (
          <GameButton variant="gold" size="lg" className="flex-1" onClick={submit} disabled={!canSubmit || sending}>
            {sending ? "Lanzando…" : (
              <>
                <Check className="h-5 w-5" /> Enviar · +{XP.completeSurvey} XP
              </>
            )}
          </GameButton>
        )}
      </div>
    </div>
  );
};

export default RecognitionSurvey;
~~~

