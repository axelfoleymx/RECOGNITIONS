
ALTER TABLE public.people ADD COLUMN song_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true);

CREATE POLICY "Authenticated users can upload songs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'songs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read songs"
ON storage.objects FOR SELECT
USING (bucket_id = 'songs');

CREATE POLICY "Users can update their own songs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'songs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own songs"
ON storage.objects FOR DELETE
USING (bucket_id = 'songs' AND auth.uid() IS NOT NULL);
