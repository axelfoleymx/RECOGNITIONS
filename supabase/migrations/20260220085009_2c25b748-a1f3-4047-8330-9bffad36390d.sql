-- Allow users to update their own recognitions
CREATE POLICY "Users can update own recognitions"
ON public.recognitions
FOR UPDATE
USING (auth.uid() = author_user_id)
WITH CHECK (auth.uid() = author_user_id);

-- Allow users to delete their own recognitions
CREATE POLICY "Users can delete own recognitions"
ON public.recognitions
FOR DELETE
USING (auth.uid() = author_user_id);