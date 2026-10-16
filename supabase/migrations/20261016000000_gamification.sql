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
