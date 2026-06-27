-- Add email preference column to profiles
ALTER TABLE public.app_profiles ADD COLUMN IF NOT EXISTS receber_emails boolean DEFAULT true;
