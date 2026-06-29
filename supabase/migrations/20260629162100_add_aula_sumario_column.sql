-- Add sumario column to app_aulas table
ALTER TABLE public.app_aulas ADD COLUMN IF NOT EXISTS sumario text;
