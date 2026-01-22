-- Add movie and showtime restriction columns to promo_codes
ALTER TABLE public.promo_codes
ADD COLUMN IF NOT EXISTS restricted_movie_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS restricted_showtime_ids UUID[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.promo_codes.restricted_movie_ids IS 'If set, promo code only applies to these specific movies';
COMMENT ON COLUMN public.promo_codes.restricted_showtime_ids IS 'If set, promo code only applies to these specific showtimes';