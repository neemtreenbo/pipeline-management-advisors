-- ============================================================
-- PART 1: deals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  stage       text NOT NULL DEFAULT 'Prospect',
  value       numeric DEFAULT 0,
  expected_close_date date,
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART 2: tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'todo',
  priority    text NOT NULL DEFAULT 'medium',
  due_at      timestamptz,
  completed_at timestamptz,
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART 3: notes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text,
  content     jsonb,
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART 4: proposals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.proposals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id     uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'draft',
  proposal_date timestamptz,
  next_follow_up_at timestamptz,
  link_source text,
  storage_path text,
  ai_summary  text,
  ai_metadata jsonb DEFAULT '{}',
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART 5: links (graph edges)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_type     text NOT NULL,
  from_id       uuid NOT NULL,
  to_type       text NOT NULL,
  to_id         uuid NOT NULL,
  relation_type text,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- PART 6: activities
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  event_type  text NOT NULL,
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- PART 7: RLS Policies
-- ============================================================

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- DEALS
CREATE POLICY "Org members can view deals" ON public.deals FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "Org members can create deals" ON public.deals FOR INSERT WITH CHECK (public.is_org_non_viewer(org_id) AND owner_id = auth.uid());
CREATE POLICY "Owner or managers can update deals" ON public.deals FOR UPDATE USING (owner_id = auth.uid() OR public.is_org_manager(org_id));
CREATE POLICY "Owner or admins can delete deals" ON public.deals FOR DELETE USING (owner_id = auth.uid() OR public.is_org_admin(org_id));

-- TASKS
CREATE POLICY "Task access for owner/assignee/manager" ON public.tasks FOR SELECT USING (owner_id = auth.uid() OR assignee_id = auth.uid() OR public.is_org_manager(org_id));
CREATE POLICY "Org members can create tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_org_non_viewer(org_id) AND owner_id = auth.uid());
CREATE POLICY "Task updates for owner/assignee/manager" ON public.tasks FOR UPDATE USING (owner_id = auth.uid() OR assignee_id = auth.uid() OR public.is_org_manager(org_id));
CREATE POLICY "Owner or admins can delete tasks" ON public.tasks FOR DELETE USING (owner_id = auth.uid() OR public.is_org_admin(org_id));

-- NOTES
CREATE POLICY "Note access for author/manager" ON public.notes FOR SELECT USING (author_id = auth.uid() OR public.is_org_manager(org_id));
CREATE POLICY "Org members can create notes" ON public.notes FOR INSERT WITH CHECK (public.is_org_non_viewer(org_id) AND author_id = auth.uid());
CREATE POLICY "Note updates for author/manager" ON public.notes FOR UPDATE USING (author_id = auth.uid() OR public.is_org_manager(org_id));
CREATE POLICY "Author or admins can delete notes" ON public.notes FOR DELETE USING (author_id = auth.uid() OR public.is_org_admin(org_id));

-- PROPOSALS
CREATE POLICY "Proposal access for owner/manager/deal owner" ON public.proposals FOR SELECT USING (
  owner_id = auth.uid() 
  OR public.is_org_manager(org_id) 
  OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.owner_id = auth.uid())
);
CREATE POLICY "Org members can create proposals" ON public.proposals FOR INSERT WITH CHECK (public.is_org_non_viewer(org_id) AND owner_id = auth.uid());
CREATE POLICY "Proposal updates for owner/manager" ON public.proposals FOR UPDATE USING (owner_id = auth.uid() OR public.is_org_manager(org_id));
CREATE POLICY "Owner or admins can delete proposals" ON public.proposals FOR DELETE USING (owner_id = auth.uid() OR public.is_org_admin(org_id));

-- LINKS
CREATE POLICY "Org members can view links" ON public.links FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "Org members can create links" ON public.links FOR INSERT WITH CHECK (public.is_org_non_viewer(org_id) AND created_by = auth.uid());
CREATE POLICY "Creator or admins can delete links" ON public.links FOR DELETE USING (created_by = auth.uid() OR public.is_org_admin(org_id));

-- ACTIVITIES
CREATE POLICY "Org members can view activities" ON public.activities FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "Org members can create activities" ON public.activities FOR INSERT WITH CHECK (public.is_org_non_viewer(org_id) AND actor_id = auth.uid());
