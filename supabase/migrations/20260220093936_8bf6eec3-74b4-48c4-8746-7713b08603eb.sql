
ALTER TABLE public.recognitions DROP CONSTRAINT recognitions_recognized_person_id_fkey;
ALTER TABLE public.recognitions ADD CONSTRAINT recognitions_recognized_person_id_fkey FOREIGN KEY (recognized_person_id) REFERENCES public.people(id) ON DELETE CASCADE;

ALTER TABLE public.votes DROP CONSTRAINT votes_voted_person_id_fkey;
ALTER TABLE public.votes ADD CONSTRAINT votes_voted_person_id_fkey FOREIGN KEY (voted_person_id) REFERENCES public.people(id) ON DELETE CASCADE;

ALTER TABLE public.weeks DROP CONSTRAINT weeks_winner_person_id_fkey;
ALTER TABLE public.weeks ADD CONSTRAINT weeks_winner_person_id_fkey FOREIGN KEY (winner_person_id) REFERENCES public.people(id) ON DELETE SET NULL;
