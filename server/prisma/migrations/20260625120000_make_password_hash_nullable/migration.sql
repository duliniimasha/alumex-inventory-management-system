-- Passwords are now owned by Supabase Auth; the application no longer writes
-- `password_hash`. Make the legacy column nullable so new users (provisioned
-- via Supabase) can be created without it.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
