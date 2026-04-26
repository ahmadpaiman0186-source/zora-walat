-- Optional account binding for web top-up orders (anonymous rows keep userId NULL).
ALTER TABLE "WebTopupOrder" ADD COLUMN "userId" TEXT;

CREATE INDEX "WebTopupOrder_userId_createdAt_idx" ON "WebTopupOrder"("userId", "createdAt");

ALTER TABLE "WebTopupOrder" ADD CONSTRAINT "WebTopupOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
