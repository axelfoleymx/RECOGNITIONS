CREATE POLICY "Admins can delete votes"
ON public.votes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));