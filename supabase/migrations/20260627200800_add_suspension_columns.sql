-- Add columns for user suspension
ALTER TABLE public.app_profiles ADD COLUMN IF NOT EXISTS suspenso boolean DEFAULT false;
ALTER TABLE public.app_profiles ADD COLUMN IF NOT EXISTS aulas_suspensas text[] DEFAULT ARRAY[]::text[];
