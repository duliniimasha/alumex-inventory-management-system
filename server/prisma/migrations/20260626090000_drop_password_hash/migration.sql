-- Passwords are now fully owned by Supabase Auth (auth.users.encrypted_password).
-- The legacy `password_hash` column on the application users table is obsolete.
--
-- ⚠️  ORDERING: apply this ONLY AFTER the one-time user import
-- (prisma/import-users-to-supabase-auth.sql) has succeeded and logins are
-- verified — this column is the password source for that import. Dropping it
-- beforehand would permanently lose the existing password hashes.
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
