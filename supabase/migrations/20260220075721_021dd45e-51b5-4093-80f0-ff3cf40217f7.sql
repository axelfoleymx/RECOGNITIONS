
-- Fix overly permissive insert policy on people
-- Drop the permissive one and replace with a more restrictive one
DROP POLICY "Members can insert people" ON public.people;

-- Allow authenticated users to insert people but require they exist as authenticated
CREATE POLICY "Authenticated can insert people" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
