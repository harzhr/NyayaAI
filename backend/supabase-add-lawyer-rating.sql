-- Optional rating used by Smart Lawyer Matching.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_rating_range_chk;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_rating_range_chk
CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
