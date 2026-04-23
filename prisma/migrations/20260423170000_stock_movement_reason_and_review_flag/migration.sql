ALTER TABLE "inventory_items"
ADD COLUMN "needs_supervisor_review" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "stock_movements"
ADD COLUMN "reason" TEXT;
