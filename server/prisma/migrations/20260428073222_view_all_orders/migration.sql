-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contact_phone" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
