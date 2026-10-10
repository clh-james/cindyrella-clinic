-- Create a new storage bucket for service images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the new bucket
-- Allow public read access to service images
CREATE POLICY "Public Read Access for service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

-- Allow authenticated admins/staff to insert images
CREATE POLICY "Allow authenticated uploads to service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- Allow authenticated admins/staff to update their images
CREATE POLICY "Allow authenticated updates to service images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images');

-- Allow authenticated admins/staff to delete images
CREATE POLICY "Allow authenticated deletes to service images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-images');
