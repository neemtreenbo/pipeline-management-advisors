-- ============================================================
-- PART 1: organizations table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  settings    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 2: memberships table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'pending', 'suspended')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: Helper functions for RLS policies
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active'
  );
$$;

-- ============================================================
-- PART 4: RLS Policies
-- ============================================================

-- organizations policies
CREATE POLICY "Org members can view org"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Authenticated users can create org"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Org admins can update org"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(id));

-- memberships policies
CREATE POLICY "Org members can view membership list"
  ON public.memberships FOR SELECT
  USING (public.is_org_member(org_id));

CREATE POLICY "Org admins can insert memberships"
  ON public.memberships FOR INSERT
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "Org admins can update memberships"
  ON public.memberships FOR UPDATE
  USING (public.is_org_admin(org_id));

CREATE POLICY "Org admins can delete memberships"
  ON public.memberships FOR DELETE
  USING (public.is_org_admin(org_id));

-- ============================================================
-- PART 5: Auto-admin trigger on org creation
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.memberships (org_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'admin', 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- ============================================================
-- PART 6: Link profiles.default_organization_id → organizations
-- ============================================================

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_org_fkey
  FOREIGN KEY (default_organization_id)
  REFERENCES public.organizations(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
