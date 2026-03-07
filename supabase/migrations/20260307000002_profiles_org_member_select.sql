-- ============================================================
-- Allow org members to view fellow member profiles
-- Needed for displaying actor names in activity feeds
-- ============================================================

CREATE POLICY "Org members can view fellow member profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.memberships m1
      JOIN public.memberships m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
        AND m1.status = 'active'
        AND m2.status = 'active'
    )
  );
