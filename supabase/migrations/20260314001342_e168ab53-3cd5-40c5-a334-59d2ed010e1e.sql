
-- Add identity for admin user
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
SELECT 
  id, id, 
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', id::text, now(), now(), now()
FROM auth.users 
WHERE email = '1999tiagosanches@gmail.com'
ON CONFLICT DO NOTHING;
