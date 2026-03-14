
-- Create a function to seed the admin user
CREATE OR REPLACE FUNCTION public.seed_admin_user()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_uid FROM auth.users WHERE email = '1999tiagosanches@gmail.com';
  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      '1999tiagosanches@gmail.com',
      crypt('grt', gen_salt('bf')),
      now(),
      '{"name": "Tiago Sanches", "role": "admin"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      ''
    );
    -- The trigger will auto-create profile and user_role
  END IF;
END;
$$;

SELECT public.seed_admin_user();
DROP FUNCTION public.seed_admin_user();
