-- ============================================================
-- PART 1: clients table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name        text NOT NULL,
  email       text,
  phone       text,
  source      text,
  tags        text[] DEFAULT '{}',
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART 2: Enable RLS
-- ============================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: Helper — is_org_non_viewer (member, manager, or admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_non_viewer(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('member', 'manager', 'admin')
      AND status = 'active'
  );
$$;

-- ============================================================
-- PART 4: RLS Policies  (follows rls_guide.md §6.4)
-- ============================================================

-- SELECT: any active org member can read clients in their org
CREATE POLICY "Org members can view clients"
  ON public.clients FOR SELECT
  USING (public.is_org_member(org_id));

-- INSERT: member/manager/admin can create; owner_id must be the creator
CREATE POLICY "Org members can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.is_org_non_viewer(org_id)
    AND owner_id = auth.uid()
  );

-- UPDATE: owner OR manager/admin
CREATE POLICY "Owner or managers can update clients"
  ON public.clients FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR public.is_org_manager(org_id)
  );

-- DELETE: owner OR admin
CREATE POLICY "Owner or admins can delete clients"
  ON public.clients FOR DELETE
  USING (
    owner_id = auth.uid()
    OR public.is_org_admin(org_id)
  );
