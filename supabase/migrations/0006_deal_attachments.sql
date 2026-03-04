-- ============================================================
-- Migration 0006: deal_attachments table + deal-files bucket
-- ============================================================

-- ----------------------------------------------------------------
-- PART 1: deal_attachments
-- Stores versioned file uploads tied to a deal.
-- Each upload creates a new record (old files are NOT overwritten).
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_type     text NOT NULL DEFAULT 'proposal',  -- 'proposal' | 'supporting_document'
  file_name     text NOT NULL,
  storage_path  text NOT NULL,
  mime_type     text,
  size_bytes    integer,
  uploaded_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- PART 2: RLS for deal_attachments
-- Access follows the parent deal's permissions:
--   - View:   org members who can view the deal
--   - Insert: org members who can edit (non-viewer)
--   - Delete: uploader or org admins
-- ----------------------------------------------------------------

ALTER TABLE public.deal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view deal attachments"
  ON public.deal_attachments FOR SELECT
  USING (public.is_org_member(org_id));

CREATE POLICY "Org non-viewers can upload deal attachments"
  ON public.deal_attachments FOR INSERT
  WITH CHECK (
    public.is_org_non_viewer(org_id)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Uploader or org admins can delete deal attachments"
  ON public.deal_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR public.is_org_admin(org_id)
  );

-- ----------------------------------------------------------------
-- PART 3: deal-files storage bucket
-- Private bucket — files are served via signed URLs only.
-- ----------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-files', 'deal-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: view (download)
CREATE POLICY "Authenticated users can read deal files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'deal-files');

-- Storage RLS: insert (upload)
CREATE POLICY "Authenticated users can upload deal files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deal-files');

-- Storage RLS: delete
CREATE POLICY "Authenticated users can delete their deal files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'deal-files');
