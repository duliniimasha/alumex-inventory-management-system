-- =============================================================================
-- Seeds the demo/dev users into Supabase Auth (GoTrue).
--
-- Run AFTER seed.sql (which creates the matching public.users profiles). The
-- ids here are identical to seed.sql so the Supabase token `sub` resolves to the
-- application user. Idempotent: re-running updates the password in place.
--
-- These are the same credentials previously used for local testing:
--   sysadmin@alumex.local            / Admin@12345
--   export.coordinator@alumex.local  / Export@12345
--   warehouse.officer@alumex.local   / Warehouse@12345
--   production.supervisor@alumex.local / Production@12345
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH seed_users (id, email, password) AS (
  VALUES
    ('2f5e5ca2-1f74-4aec-a649-a4037e9f6f9a'::uuid, 'sysadmin@alumex.local',            'Admin@12345'),
    ('49cfb6d6-8474-45c3-8a6f-3f83f5dd52da'::uuid, 'export.coordinator@alumex.local',  'Export@12345'),
    ('95e15f6c-ef81-4af2-9f90-2990eb4fb8ad'::uuid, 'warehouse.officer@alumex.local',   'Warehouse@12345'),
    ('c434ef36-4557-43b2-a7d3-60841c229688'::uuid, 'production.supervisor@alumex.local', 'Production@12345')
),
-- 1. Auth users -------------------------------------------------------------
upsert_users AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    s.id, 'authenticated', 'authenticated', lower(s.email),
    crypt(s.password, gen_salt('bf', 12)),
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb, false,
    '', '', '', '', '', '', '', ''
  FROM seed_users s
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    updated_at = now()
  RETURNING 1
)
-- 2. Auth identities (email provider) --------------------------------------
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  s.id::text, s.id,
  jsonb_build_object('sub', s.id::text, 'email', lower(s.email), 'email_verified', true),
  'email', now(), now(), now()
FROM seed_users s
ON CONFLICT (provider_id, provider) DO NOTHING;
