/*
  Warnings:

  - You are about to drop the column `result` on the `qc_inspections` table. All the data in the column will be lost.
  - Changed the type of `process_type` on the `production_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `status` to the `qc_inspections` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('BILLET', 'ALLOY', 'CHEMICAL', 'COATING', 'TRADED_GOOD');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('EXTRUSION', 'COATING', 'DIE_CASTING', 'VALUE_ADD');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('PASS', 'HOLD', 'REJECT', 'PENDING');

-- AlterTable
ALTER TABLE "production_jobs" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "qc_status" "QcStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "process_type",
ADD COLUMN     "process_type" "ProcessType" NOT NULL;

-- AlterTable
ALTER TABLE "qc_inspections" DROP COLUMN "result",
ADD COLUMN     "status" "QcStatus" NOT NULL;

-- AlterTable
ALTER TABLE "raw_materials" ADD COLUMN     "material_category" "MaterialCategory" NOT NULL DEFAULT 'BILLET',
ADD COLUMN     "origin" TEXT;
