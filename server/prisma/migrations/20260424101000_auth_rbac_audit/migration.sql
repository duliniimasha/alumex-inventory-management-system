-- Add auth columns to users
ALTER TABLE "users"
ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add ownership columns
ALTER TABLE "customers"
ADD COLUMN "owner_user_id" TEXT;

ALTER TABLE "sales_orders"
ADD COLUMN "owner_user_id" TEXT;

-- Create revoked token blocklist
CREATE TABLE "revoked_tokens" (
    "revoked_token_id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("revoked_token_id")
);

CREATE UNIQUE INDEX "revoked_tokens_jti_key" ON "revoked_tokens"("jti");
CREATE INDEX "revoked_tokens_expires_at_idx" ON "revoked_tokens"("expires_at");

-- Create audit logs
CREATE TABLE "audit_logs" (
    "audit_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_id")
);

CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- Foreign keys
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
