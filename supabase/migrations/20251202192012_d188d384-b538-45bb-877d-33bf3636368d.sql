-- Update all existing metas to use the first day of the month
UPDATE public.metas
SET mes = date_trunc('month', mes)::date
WHERE mes != date_trunc('month', mes)::date;