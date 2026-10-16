# PARTE 1 DE 6 — Rocketing Recognitions 2.0

Ejecuta los pasos de este documento en orden. Copia cada archivo EXACTAMENTE (contenido completo).

Paso 1 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Base de datos

Aplica estas 3 migraciones de Supabase, en este orden, en el MISMO proyecto de Supabase que ya está conectado. Son aditivas: solo agregan tablas, columnas y funciones; no borran nada. Apruébalas/ejecútalas y después regenera `src/integrations/supabase/types.ts` para que incluya las tablas nuevas (award_categories, week_awards, award_votes, milestones, milestone_participants, self_checkins), las columnas nuevas (recognitions.pillar, question_id, rating; award_votes.is_self; award_categories.is_custom, created_by; people.youtube_url) y las funciones (ensure_week_awards, propose_week_award, get_recent_rocketers, get_checkin_pulse). No cambies ningún archivo de la app en este paso.

### Archivo: `supabase/migrations/20261016000000_gamification.sql`

~~~sql
-- Gamification 2.0: weekly mini-awards with rocket-level peer votes,
-- milestones (hitos) with participants, pillar tags on recognitions,
-- and anti-favoritism rules (no self-votes, max 2 awards per nominee, Rocketer cooldown).

-- ---------------------------------------------------------------
-- Pillar tag on recognitions (productividad, cliente, actitud, ...)
-- ---------------------------------------------------------------
ALTER TABLE public.recognitions ADD COLUMN IF NOT EXISTS pillar text;

-- ---------------------------------------------------------------
-- Award catalog
-- ---------------------------------------------------------------
CREATE TABLE public.award_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏆',
  pillar TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read award categories" ON public.award_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage award categories" ON public.award_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.award_categories (slug, name, description, emoji, pillar, sort_order) VALUES
  ('puntual',      'El/La Más Puntual',        'Llega a tiempo a juntas, calls y entregas. Respeta el tiempo de todos.', '⏰', 'actitud',       1),
  ('deadline',     'Deadline Killer',          'Termina lo que empieza, en tiempo y forma. Cero pendientes arrastrados.', '✅', 'productividad', 2),
  ('cliente',      'Héroe del Cliente',        'Responde rápido, resuelve y deja al cliente feliz.',                      '💬', 'cliente',       3),
  ('buena-vibra',  'Buena Vibra',              'Contagia buena actitud y levanta al equipo en días pesados.',             '🌞', 'actitud',       4),
  ('emprendedor',  'Iniciativa Emprendedora',  'Propone y ejecuta ideas sin que se lo pidan. Actúa como dueño.',           '🚀', 'emprendedor',   5),
  ('creativo',     'Mente Creativa',           'La idea, copy o diseño más brillante de la semana.',                      '🎨', 'creatividad',   6),
  ('data',         'Data Wizard',              'Decide con datos, reporta resultados y mueve las métricas.',              '📈', 'resultados',    7),
  ('team-player',  'Team Player',              'Ayudó a que otros sacaran su trabajo adelante.',                          '🤝', 'colaboracion',  8),
  ('apagafuegos',  'Apagafuegos',              'Resolvió una urgencia o crisis con cabeza fría.',                         '🔥', 'cliente',       9),
  ('cero-errores', 'Cero Retrabajos',          'Calidad impecable a la primera. Nada regresa.',                           '🎯', 'productividad', 10),
  ('cierra-tratos','Cierra Tratos',            'Ganó, retuvo o creció una cuenta.',                                      '💰', 'emprendedor',   11),
  ('aprendiz',     'Aprendiz Imparable',       'Aprendió algo nuevo y lo compartió con el equipo.',                      '📚', 'crecimiento',   12);

-- ---------------------------------------------------------------
-- Which 5 awards are active in a given week
-- ---------------------------------------------------------------
CREATE TABLE public.week_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  UNIQUE (week_id, category_id)
);

ALTER TABLE public.week_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read week awards" ON public.week_awards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage week awards" ON public.week_awards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-assigns the 5 least-recently-used active categories to a week (idempotent).
CREATE OR REPLACE FUNCTION public.ensure_week_awards(_week_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.week_awards WHERE week_id = _week_id) THEN
    INSERT INTO public.week_awards (week_id, category_id, position)
    SELECT _week_id, ranked.id, ranked.pos
    FROM (
      SELECT c.id,
             row_number() OVER (ORDER BY lu.last_used NULLS FIRST, c.sort_order) AS pos
      FROM public.award_categories c
      LEFT JOIN LATERAL (
        SELECT max(w.start_date) AS last_used
        FROM public.week_awards wa
        JOIN public.weeks w ON w.id = wa.week_id
        WHERE wa.category_id = c.id
      ) lu ON true
      WHERE c.active
    ) ranked
    WHERE ranked.pos <= 5;
  END IF;
END;
$$;

-- ---------------------------------------------------------------
-- Peer votes per award, with rocket level 1..3
-- ---------------------------------------------------------------
CREATE TABLE public.award_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL,
  nominee_person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  rockets SMALLINT NOT NULL DEFAULT 1 CHECK (rockets BETWEEN 1 AND 3),
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_id, category_id, voter_user_id)
);

ALTER TABLE public.award_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read award votes" ON public.award_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can cast own award votes in open weeks" ON public.award_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.status = 'open')
  );

CREATE POLICY "Users can update own award votes in open weeks" ON public.award_votes
  FOR UPDATE TO authenticated
  USING (auth.uid() = voter_user_id)
  WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.status = 'open')
  );

CREATE POLICY "Users can delete own award votes" ON public.award_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = voter_user_id);

CREATE POLICY "Admins can delete award votes" ON public.award_votes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_award_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.people p WHERE p.id = NEW.nominee_person_id AND p.user_id = NEW.voter_user_id) THEN
    RAISE EXCEPTION 'No puedes votar por ti mismo/a';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.week_awards wa WHERE wa.week_id = NEW.week_id AND wa.category_id = NEW.category_id) THEN
    RAISE EXCEPTION 'Ese premio no está activo esta semana';
  END IF;

  IF (
    SELECT count(*) FROM public.award_votes av
    WHERE av.week_id = NEW.week_id
      AND av.voter_user_id = NEW.voter_user_id
      AND av.nominee_person_id = NEW.nominee_person_id
      AND av.id <> NEW.id
  ) >= 2 THEN
    RAISE EXCEPTION 'Máximo 2 premios por persona: reparte tus votos';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_award_vote
  BEFORE INSERT OR UPDATE ON public.award_votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_award_vote();

-- ---------------------------------------------------------------
-- Rocketer cooldown + no self-vote
-- ---------------------------------------------------------------
-- People who were the most-voted Rocketer in any of the 3 weeks before _week_id.
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
      AND w.start_date >= ref.start_date - 21
    GROUP BY v.week_id, w.start_date, v.voted_person_id
  ),
  maxes AS (SELECT week_id, max(c) AS m FROM counts GROUP BY week_id)
  SELECT c.voted_person_id, c.start_date
  FROM counts c JOIN maxes m ON m.week_id = c.week_id AND m.m = c.c
$$;

CREATE OR REPLACE FUNCTION public.validate_rocketer_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.people p WHERE p.id = NEW.voted_person_id AND p.user_id = NEW.voter_user_id) THEN
    RAISE EXCEPTION 'No puedes votar por ti mismo/a';
  END IF;

  IF EXISTS (SELECT 1 FROM public.get_recent_rocketers(NEW.week_id) r WHERE r.person_id = NEW.voted_person_id) THEN
    RAISE EXCEPTION 'Esta persona fue Rocketer en las últimas 3 semanas (cooldown). ¡Dale oportunidad a alguien más!';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_rocketer_vote
  BEFORE INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_rocketer_vote();

-- ---------------------------------------------------------------
-- Milestones (hitos) of the week + participants
-- ---------------------------------------------------------------
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'entrega',
  impact SMALLINT NOT NULL DEFAULT 1 CHECK (impact BETWEEN 1 AND 3),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read milestones" ON public.milestones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create milestones" ON public.milestones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners or admins can update milestones" ON public.milestones
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can delete milestones" ON public.milestones
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.milestone_participants (
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_id, person_id)
);

ALTER TABLE public.milestone_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read milestone participants" ON public.milestone_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners or admins can add participants" ON public.milestone_participants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.milestones m
    WHERE m.id = milestone_id AND (m.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Owners or admins can remove participants" ON public.milestone_participants
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m
    WHERE m.id = milestone_id AND (m.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.award_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;

NOTIFY pgrst, 'reload schema';
~~~

### Archivo: `supabase/migrations/20261016100000_gamification_v2.sql`

~~~sql
-- Gamification v2:
--  * Recognitions survey (question + 1..3 rating per person, bulk friendly)
--  * Self-evaluation check-in (speed + reason + blockers + linked milestones + self ratings worth 1/2)
--  * Award self-nomination worth 1/2 (max 1 per week)
--  * One team-proposed extra award per week

-- ---------------------------------------------------------------
-- Survey answers live in recognitions
-- ---------------------------------------------------------------
ALTER TABLE public.recognitions
  ADD COLUMN IF NOT EXISTS question_id text,
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating BETWEEN 1 AND 3);

-- ---------------------------------------------------------------
-- Award self-votes count 1/2 (max 1 self-nomination per week)
-- ---------------------------------------------------------------
ALTER TABLE public.award_votes ADD COLUMN IF NOT EXISTS is_self boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_award_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_self := EXISTS (
    SELECT 1 FROM public.people p WHERE p.id = NEW.nominee_person_id AND p.user_id = NEW.voter_user_id
  );

  IF NOT EXISTS (SELECT 1 FROM public.week_awards wa WHERE wa.week_id = NEW.week_id AND wa.category_id = NEW.category_id) THEN
    RAISE EXCEPTION 'Ese premio no está activo esta semana';
  END IF;

  IF NEW.is_self AND EXISTS (
    SELECT 1 FROM public.award_votes av
    WHERE av.week_id = NEW.week_id AND av.voter_user_id = NEW.voter_user_id AND av.is_self AND av.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Solo puedes autonominarte en 1 premio por semana (vale 1/2)';
  END IF;

  IF (
    SELECT count(*) FROM public.award_votes av
    WHERE av.week_id = NEW.week_id
      AND av.voter_user_id = NEW.voter_user_id
      AND av.nominee_person_id = NEW.nominee_person_id
      AND av.id <> NEW.id
  ) >= 2 THEN
    RAISE EXCEPTION 'Máximo 2 premios por persona: reparte tus votos';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- One custom (team-proposed) award per week
-- ---------------------------------------------------------------
ALTER TABLE public.award_categories
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Rotation never picks custom awards
CREATE OR REPLACE FUNCTION public.ensure_week_awards(_week_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.week_awards WHERE week_id = _week_id) THEN
    INSERT INTO public.week_awards (week_id, category_id, position)
    SELECT _week_id, ranked.id, ranked.pos
    FROM (
      SELECT c.id,
             row_number() OVER (ORDER BY lu.last_used NULLS FIRST, c.sort_order) AS pos
      FROM public.award_categories c
      LEFT JOIN LATERAL (
        SELECT max(w.start_date) AS last_used
        FROM public.week_awards wa
        JOIN public.weeks w ON w.id = wa.week_id
        WHERE wa.category_id = c.id
      ) lu ON true
      WHERE c.active AND NOT c.is_custom
    ) ranked
    WHERE ranked.pos <= 5;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_week_award(
  _week_id UUID, _name TEXT, _description TEXT, _emoji TEXT, _pillar TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Necesitas iniciar sesión';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.weeks WHERE id = _week_id AND status = 'open') THEN
    RAISE EXCEPTION 'La semana ya está cerrada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.week_awards wa
    JOIN public.award_categories c ON c.id = wa.category_id
    WHERE wa.week_id = _week_id AND c.is_custom
  ) THEN
    RAISE EXCEPTION 'Ya se agregó el premio extra de esta semana (máximo 1)';
  END IF;
  IF length(trim(_name)) < 3 OR length(_name) > 40 THEN
    RAISE EXCEPTION 'El nombre debe tener entre 3 y 40 caracteres';
  END IF;

  INSERT INTO public.award_categories (slug, name, description, emoji, pillar, active, is_custom, created_by, sort_order)
  VALUES ('custom-' || substr(gen_random_uuid()::text, 1, 8), trim(_name), left(coalesce(_description, ''), 160),
          coalesce(nullif(_emoji, ''), '🏅'), coalesce(nullif(_pillar, ''), 'actitud'), false, true, auth.uid(), 999)
  RETURNING id INTO new_id;

  INSERT INTO public.week_awards (week_id, category_id, position) VALUES (_week_id, new_id, 99);
  RETURN new_id;
END;
$$;

-- ---------------------------------------------------------------
-- Self-evaluation check-in (private: owner + admins)
-- ---------------------------------------------------------------
CREATE TABLE public.self_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  speed TEXT NOT NULL CHECK (speed IN ('bajo', 'crucero', 'maximo')),
  reason TEXT NOT NULL DEFAULT '',
  blockers TEXT[] NOT NULL DEFAULT '{}',
  next_step TEXT NOT NULL DEFAULT '',
  milestone_ids UUID[] NOT NULL DEFAULT '{}',
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_id, user_id)
);

ALTER TABLE public.self_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own checkins, admins read all" ON public.self_checkins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own checkin in open weeks" ON public.self_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.status = 'open')
  );

CREATE POLICY "Users update own checkin in open weeks" ON public.self_checkins
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.status = 'open')
  );

CREATE POLICY "Users delete own checkin" ON public.self_checkins
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_checkin_person()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT id INTO NEW.person_id FROM public.people WHERE user_id = NEW.user_id LIMIT 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_checkin_person
  BEFORE INSERT OR UPDATE ON public.self_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_checkin_person();

-- Anonymous team pulse (counts only) visible to everyone
CREATE OR REPLACE FUNCTION public.get_checkin_pulse(_week_id UUID)
RETURNS TABLE (speed TEXT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT speed, count(*) FROM public.self_checkins WHERE week_id = _week_id GROUP BY speed
$$;

NOTIFY pgrst, 'reload schema';
~~~

### Archivo: `supabase/migrations/20261016200000_victory_video.sql`

~~~sql
-- Victory video: each person can link a YouTube video that plays (or opens)
-- when they win Rocketer of the Week. Replaces the MP3 song upload.
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS youtube_url text;

NOTIFY pgrst, 'reload schema';
~~~

---

Paso 2 de 13 de la actualización "Rocketing Recognitions 2.0".

Reglas para TODOS los pasos:
- Crea o reemplaza los archivos de abajo EXACTAMENTE con el contenido indicado. No cambies estilos, textos ni lógica, no "mejores" ni resumas el código.
- No toques ningún otro archivo, salvo lo que diga este paso.
- No modifiques el login, la autenticación, ni borres datos (empleados, usuarios, reconocimientos, votos, semanas).
- Si al terminar hay un error de compilación, dime el error exacto en lugar de reescribir los archivos.

## Lógica del juego

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
    { id: "checkin", emoji: "🪞", title: "Autoevaluación", subtitle: "¿A qué velocidad fuiste?", progress: w.checkinDone ? 1 : 0, goal: 1, xp: XP.selfCheckin, to: "/checkin" },
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
~~~

---

