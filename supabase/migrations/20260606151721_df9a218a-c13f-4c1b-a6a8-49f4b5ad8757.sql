
-- Roles
CREATE TYPE public.app_role AS ENUM ('owner', 'supervisor');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles select own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Sites
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Site members
CREATE TABLE public.site_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_members TO authenticated;
GRANT ALL ON public.site_members TO service_role;
ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_site_member(_user_id UUID, _site_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.site_members WHERE user_id = _user_id AND site_id = _site_id)
$$;

CREATE POLICY "sites select owner or member" ON public.sites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.is_site_member(auth.uid(), id));
CREATE POLICY "sites insert owner" ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "sites update owner" ON public.sites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "sites delete owner" ON public.sites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "site_members select owner or self" ON public.site_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR user_id = auth.uid());
CREATE POLICY "site_members insert owner" ON public.site_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "site_members delete owner" ON public.site_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Entries
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  particular TEXT NOT NULL,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX entries_site_date_idx ON public.entries(site_id, entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entries select owner or member" ON public.entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.is_site_member(auth.uid(), site_id));
CREATE POLICY "entries insert owner or member" ON public.entries FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(), 'owner') OR public.is_site_member(auth.uid(), site_id)) AND created_by = auth.uid());
CREATE POLICY "entries update owner or creator" ON public.entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR created_by = auth.uid());
CREATE POLICY "entries delete owner or creator" ON public.entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR created_by = auth.uid());

-- Auto-create profile + first user becomes owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'supervisor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
