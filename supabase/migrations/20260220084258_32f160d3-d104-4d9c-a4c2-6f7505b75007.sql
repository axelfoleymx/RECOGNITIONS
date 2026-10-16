-- Allow admins to delete recognitions
CREATE POLICY "Admins can delete recognitions"
ON public.recognitions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to delete their own vote
CREATE POLICY "Users can delete own vote"
ON public.votes
FOR DELETE
USING (auth.uid() = voter_user_id);