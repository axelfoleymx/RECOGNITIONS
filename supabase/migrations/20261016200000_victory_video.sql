-- Victory video: each person can link a YouTube video that plays (or opens)
-- when they win Rocketer of the Week. Replaces the MP3 song upload.
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS youtube_url text;

NOTIFY pgrst, 'reload schema';
