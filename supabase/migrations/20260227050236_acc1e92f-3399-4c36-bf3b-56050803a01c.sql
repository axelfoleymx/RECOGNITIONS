-- Add user_id column to people table
ALTER TABLE public.people ADD COLUMN user_id uuid;

-- Add RLS policy: users can update their own song_url
CREATE POLICY "Users can update own song_url"
ON public.people
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());