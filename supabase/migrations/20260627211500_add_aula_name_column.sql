-- Add name column to aulas table
ALTER TABLE public.app_aulas ADD COLUMN IF NOT EXISTS nome text;
