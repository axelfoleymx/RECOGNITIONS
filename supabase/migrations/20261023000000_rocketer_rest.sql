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
