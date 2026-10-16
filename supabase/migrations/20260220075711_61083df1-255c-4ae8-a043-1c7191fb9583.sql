
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own, admins can read all
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- People table
CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'team' CHECK (type IN ('team', 'proveedor')),
  photo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read people" ON public.people
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert people" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update people" ON public.people
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Members can also insert people (for "not in list" flow)
CREATE POLICY "Members can insert people" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Weeks table
CREATE TABLE public.weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'published')),
  winner_person_id UUID REFERENCES public.people(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (start_date)
);

ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read weeks" ON public.weeks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage weeks" ON public.weeks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Recognitions table
CREATE TABLE public.recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES public.weeks(id) ON DELETE CASCADE NOT NULL,
  recognized_person_id UUID REFERENCES public.people(id) NOT NULL,
  message TEXT NOT NULL,
  author_user_id UUID REFERENCES auth.users(id),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recognitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read recognitions" ON public.recognitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert recognitions" ON public.recognitions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_user_id);

-- Votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES public.weeks(id) ON DELETE CASCADE NOT NULL,
  voter_user_id UUID REFERENCES auth.users(id) NOT NULL,
  voted_person_id UUID REFERENCES public.people(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_id, voter_user_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read votes" ON public.votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own vote" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_user_id);

-- Enable realtime for recognitions and votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.recognitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- Function to get or create current week
CREATE OR REPLACE FUNCTION public.get_or_create_current_week()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  week_id UUID;
BEGIN
  -- Calculate Monday of current week
  week_start := date_trunc('week', CURRENT_DATE)::DATE;
  week_end := week_start + 4; -- Friday

  SELECT id INTO week_id FROM public.weeks WHERE start_date = week_start;

  IF week_id IS NULL THEN
    INSERT INTO public.weeks (start_date, end_date, status)
    VALUES (week_start, week_end, 'open')
    RETURNING id INTO week_id;
  END IF;

  RETURN week_id;
END;
$$;

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Authenticated can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Admins can delete photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));
