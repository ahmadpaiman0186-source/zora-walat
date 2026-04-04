-- AlterTable
ALTER TABLE "PaymentCheckout" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "PaymentCheckout_userId_idx" ON "PaymentCheckout"("userId");

-- AddForeignKey
ALTER TABLE "PaymentCheckout" ADD CONSTRAINT "PaymentCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
