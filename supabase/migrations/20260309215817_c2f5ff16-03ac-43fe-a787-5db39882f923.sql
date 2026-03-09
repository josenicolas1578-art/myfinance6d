-- Add cover_image_url column to notes
ALTER TABLE public.notes ADD COLUMN cover_image_url text DEFAULT NULL;

-- Create storage bucket for note covers
INSERT INTO storage.buckets (id, name, public) VALUES ('note-covers', 'note-covers', true);

-- RLS policies for note-covers bucket
CREATE POLICY "Users can upload own note covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'note-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own note covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'note-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own note covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'note-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view note covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-covers');