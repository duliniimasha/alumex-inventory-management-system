-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'PROCUREMENT_OFFICER', 'PRODUCTION_SUPERVISOR', 'QC_INSPECTOR', 'WAREHOUSE_OFFICER', 'SALES_EXECUTIVE', 'EXPORT_COORDINATOR', 'MANAGEMENT_VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MANAGEMENT_VIEWER',
    "department" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "contact_email" TEXT,
    "certification" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "material_id" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "grade" TEXT,
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reorder_level" DOUBLE PRECISION NOT NULL,
    "supplier_id" TEXT NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("material_id")
);

-- CreateTable
CREATE TABLE "dies" (
    "die_id" TEXT NOT NULL,
    "profile_code" TEXT NOT NULL,
    "product_category" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_usage" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,

    CONSTRAINT "dies_pkey" PRIMARY KEY ("die_id")
);

-- CreateTable
CREATE TABLE "production_jobs" (
    "job_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "die_id" TEXT NOT NULL,
    "process_type" TEXT NOT NULL,
    "input_qty_kg" DOUBLE PRECISION NOT NULL,
    "output_qty_kg" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "production_jobs_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "qc_inspections" (
    "inspection_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "inspector_name" TEXT NOT NULL,
    "notes" TEXT,
    "inspected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_inspections_pkey" PRIMARY KEY ("inspection_id")
);

-- CreateTable
CREATE TABLE "products" (
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "finish_type" TEXT NOT NULL,
    "length_mm" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "job_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "location_code" TEXT NOT NULL,
    "warehouse_zone" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "country" TEXT,
    "contact_email" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "channel" TEXT,
    "status" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_date" TIMESTAMP(3),

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "line_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty_ordered" DOUBLE PRECISION NOT NULL,
    "qty_dispatched" DOUBLE PRECISION DEFAULT 0,
    "unit_price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "movement_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "movement_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "performed_by" TEXT NOT NULL,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("movement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "raw_materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_die_id_fkey" FOREIGN KEY ("die_id") REFERENCES "dies"("die_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "production_jobs"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "production_jobs"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
