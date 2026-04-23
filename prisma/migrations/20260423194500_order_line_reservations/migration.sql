ALTER TABLE "inventory_items"
ADD COLUMN "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "order_line_reservations" (
    "reservation_id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_line_reservations_pkey" PRIMARY KEY ("reservation_id")
);

CREATE UNIQUE INDEX "order_line_reservations_line_id_item_id_key"
ON "order_line_reservations"("line_id", "item_id");

ALTER TABLE "order_line_reservations"
ADD CONSTRAINT "order_line_reservations_line_id_fkey"
FOREIGN KEY ("line_id") REFERENCES "order_lines"("line_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_line_reservations"
ADD CONSTRAINT "order_line_reservations_item_id_fkey"
FOREIGN KEY ("item_id") REFERENCES "inventory_items"("item_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
