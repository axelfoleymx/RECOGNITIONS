-- Allow admins to delete people
CREATE POLICY "Admins can delete people"
ON public.people
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));