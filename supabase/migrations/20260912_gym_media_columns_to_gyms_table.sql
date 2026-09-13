-- Add gym media columns to the public gyms table for catalog display

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS main_image_url TEXT,
  ADD COLUMN IF NOT EXISTS optional_images_urls TEXT[],
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_file_url TEXT;

-- Sync existing gym media from profiles to gyms table
UPDATE public.gyms g
SET 
  main_image_url = p.gym_main_image_url,
  optional_images_urls = p.gym_optional_images_urls,
  video_url = p.gym_video_url,
  video_file_url = p.gym_video_file_url
FROM public.profiles p
WHERE g.owner_user_id = p.user_id
AND p.gym_main_image_url IS NOT NULL;
