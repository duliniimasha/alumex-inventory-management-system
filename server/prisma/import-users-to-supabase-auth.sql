-- =============================================================================
-- One-time import of existing application users into Supabase Auth (GoTrue).
--
-- Run ONCE in the Supabase SQL Editor (or via psql against DIRECT_URL) AFTER the
-- `make_password_hash_nullable` migration has been applied.
--
-- What it does:
--   * Inserts every public.users row into auth.users, REUSING the same id so
--     the Supabase token `sub` claim resolves to the same application user.
--   * Copies the existing bcrypt `password_hash` into `encrypted_password`, so
--     current passwords keep working (Supabase verifies bcrypt hashes).
--   * Creates the matching auth.identities row for the email/password provider.
--
-- Idempotent: re-running is a no-op (ON CONFLICT DO NOTHING).
-- Only users that still have a password hash are imported.
--
-- IMPORTANT: GoTrue reads several token columns as plain (non-nullable) strings
-- and returns HTTP 500 on login if they are NULL. They are therefore inserted
-- as empty strings below. Section 0 repairs any rows imported before this fix.
-- =============================================================================

-- 0. Repair previously-imported rows (NULL token columns -> '') -------------
UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;

-- 1. Auth users -------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.user_id::uuid,
  'authenticated',
  'authenticated',
  lower(u.email),
  u.password_hash,
  COALESCE(u.created_at, now()),
  COALESCE(u.created_at, now()),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('name', u.name, 'role', lower(u.role::text)),
  false,
  '', '', '', '', '', '', '', ''
FROM public.users u
WHERE u.password_hash IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Auth identities (email provider) --------------------------------------
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.user_id::text,
  u.user_id::uuid,
  jsonb_build_object('sub', u.user_id::text, 'email', lower(u.email), 'email_verified', true),
  'email',
  now(),
  COALESCE(u.created_at, now()),
  now()
FROM public.users u
WHERE u.password_hash IS NOT NULL
ON CONFLICT (provider_id, provider) DO NOTHING;

-- 3. Sanity check -----------------------------------------------------------
-- SELECT count(*) AS app_users FROM public.users;
-- SELECT count(*) AS auth_users FROM auth.users;
-- SELECT u.email FROM public.users u
--   LEFT JOIN auth.users a ON a.id = u.user_id::uuid
--   WHERE a.id IS NULL;  -- should return 0 rows
