-- Create "proposals" bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proposals', 'proposals', false) 
ON CONFLICT (id) DO NOTHING;

-- Allows authenticated users to view proposals
CREATE POLICY "Authenticated users can read proposals" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'proposals');

-- Allows authenticated users to upload proposals
CREATE POLICY "Authenticated users can upload proposals" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'proposals');
