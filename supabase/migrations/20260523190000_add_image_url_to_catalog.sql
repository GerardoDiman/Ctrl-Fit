-- Add image_url columns to catalog tables
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.muscle_groups ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create catalog_images bucket in Supabase Storage if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog_images', 'catalog_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Security Policies for catalog_images
-- 1. Enable public access to select objects in catalog_images bucket
CREATE POLICY "Public Access to catalog_images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'catalog_images');

-- 2. Allow trainers and owners to upload files to catalog_images bucket
CREATE POLICY "Trainers and Owners upload to catalog_images" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'catalog_images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('owner', 'trainer')
        )
    );

-- 3. Allow trainers and owners to update files in catalog_images bucket
CREATE POLICY "Trainers and Owners update in catalog_images" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'catalog_images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('owner', 'trainer')
        )
    );

-- 4. Allow trainers and owners to delete files in catalog_images bucket
CREATE POLICY "Trainers and Owners delete in catalog_images" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'catalog_images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('owner', 'trainer')
        )
    );
