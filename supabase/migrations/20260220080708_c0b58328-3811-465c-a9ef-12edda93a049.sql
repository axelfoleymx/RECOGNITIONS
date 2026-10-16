
-- Validate email domain on signup via trigger
CREATE OR REPLACE FUNCTION public.validate_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email NOT LIKE '%@rocketing.agency' THEN
    RAISE EXCEPTION 'Solo emails @rocketing.agency pueden registrarse';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_signup_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validate_email_domain();
