-- CreateEnum
CREATE TYPE "CancelledByRole" AS ENUM ('CLIENT', 'VENDOR', 'ADMIN');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by_role" "CancelledByRole",
ADD COLUMN     "cancelled_by_user_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_orders_cancelled_by_user_id" ON "orders"("cancelled_by_user_id");

-- CreateIndex
CREATE INDEX "idx_orders_cancelled_by_role" ON "orders"("cancelled_by_role");

-- CreateIndex
CREATE INDEX "idx_orders_cancelled_at" ON "orders"("cancelled_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
