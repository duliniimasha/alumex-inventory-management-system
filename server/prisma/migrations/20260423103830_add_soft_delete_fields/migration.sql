-- AlterTable
ALTER TABLE "dies" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "raw_materials" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "deleted_at" TIMESTAMP(3);
