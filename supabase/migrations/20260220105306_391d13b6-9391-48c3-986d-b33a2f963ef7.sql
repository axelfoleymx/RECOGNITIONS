-- Drop FK constraints that reference auth.users so data persists after user deletion
ALTER TABLE public.recognitions DROP CONSTRAINT IF EXISTS recognitions_author_user_id_fkey;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_voter_user_id_fkey;

-- Make voter_user_id NOT NULL again since we're keeping the data
ALTER TABLE public.votes ALTER COLUMN voter_user_id SET NOT NULL;