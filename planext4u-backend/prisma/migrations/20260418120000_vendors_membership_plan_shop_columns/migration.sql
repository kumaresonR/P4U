-- Align DB with schema.prisma Vendor model (columns existed in schema but were missing from init migration).
ALTER TABLE "vendors" ADD COLUMN "membership" TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE "vendors" ADD COLUMN "plan_payment_status" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "vendors" ADD COLUMN "plan_transaction_id" TEXT DEFAULT '';
ALTER TABLE "vendors" ADD COLUMN "shop_photo_url" TEXT DEFAULT '';
