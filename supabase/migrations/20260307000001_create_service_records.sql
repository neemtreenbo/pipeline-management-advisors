-- ============================================================
-- Service Records: post-deal and general client servicing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id         uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  assignee_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  type            text NOT NULL DEFAULT 'follow_up'
                  CHECK (type IN ('renewal','review','follow_up','claim','check_in','custom')),
  status          text NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming','in_progress','completed','overdue')),
  title           text NOT NULL,
  description     text,
  due_date        date NOT NULL,
  completed_at    timestamptz,
  data            jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TRIGGER service_records_updated_at
  BEFORE UPDATE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view service_records"
  ON public.service_records FOR SELECT
  USING (public.is_org_member(org_id));

CREATE POLICY "Org non-viewers can create service_records"
  ON public.service_records FOR INSERT
  WITH CHECK (public.is_org_non_viewer(org_id) AND owner_id = auth.uid());

CREATE POLICY "Owner/assignee/managers can update service_records"
  ON public.service_records FOR UPDATE
  USING (owner_id = auth.uid() OR assignee_id = auth.uid() OR public.is_org_manager(org_id));

CREATE POLICY "Owner or admins can delete service_records"
  ON public.service_records FOR DELETE
  USING (owner_id = auth.uid() OR public.is_org_admin(org_id));

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_service_records_org ON public.service_records(org_id);
CREATE INDEX idx_service_records_client ON public.service_records(client_id);
CREATE INDEX idx_service_records_due ON public.service_records(due_date);
CREATE INDEX idx_service_records_status ON public.service_records(status);
