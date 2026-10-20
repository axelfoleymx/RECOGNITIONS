-- Idempotent: safe to run again on a database where it was already applied.
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
CREATE TABLE IF NOT EXISTS public.self_checkins (
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

DROP POLICY IF EXISTS "Users read own checkins, admins read all" ON public.self_checkins;
CREATE POLICY "Users read own checkins, admins read all" ON public.self_checkins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users create own checkin in open weeks" ON public.self_checkins;
CREATE POLICY "Users create own checkin in open weeks" ON public.self_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.status = 'open')
  );

DROP POLICY IF EXISTS "Users update own checkin in open weeks" ON public.self_checkins;
CREATE POLICY "Users update own checkin in open weeks" ON public.self_checkins
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.status = 'open')
  );

DROP POLICY IF EXISTS "Users delete own checkin" ON public.self_checkins;
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

DROP TRIGGER IF EXISTS set_checkin_person ON public.self_checkins;
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
