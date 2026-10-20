-- Idempotent: safe to run again on a database where it was already applied.
-- Team climate (eNPS-style): each self-evaluation records how the person felt
-- this week (1 = triste … 5 = ¡wow!) and whether they would like support.

ALTER TABLE public.self_checkins
  ADD COLUMN IF NOT EXISTS mood SMALLINT CHECK (mood BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS wants_support BOOLEAN NOT NULL DEFAULT false;

-- Anonymous team climate (counts only) visible to everyone
CREATE OR REPLACE FUNCTION public.get_mood_pulse(_week_id UUID)
RETURNS TABLE (mood SMALLINT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.mood, count(*) FROM public.self_checkins c
  WHERE c.week_id = _week_id AND c.mood IS NOT NULL
  GROUP BY c.mood
$$;

NOTIFY pgrst, 'reload schema';
