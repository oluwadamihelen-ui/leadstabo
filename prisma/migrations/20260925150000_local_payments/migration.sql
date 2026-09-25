-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('PLAN', 'CREDITS');

-- DropIndex
DROP INDEX "Workspace_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "annualPriceNgn" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyPriceNgn" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "gateway" TEXT,
ADD COLUMN     "lastCreditGrantAt" TIMESTAMP(3),
ADD COLUMN     "renewalRemindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "stripeCustomerId",
ADD COLUMN     "billingCurrency" TEXT NOT NULL DEFAULT 'USD';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "gateway" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "planKey" TEXT,
    "interval" "BillingInterval",
    "credits" INTEGER,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayRef" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_workspaceId_createdAt_idx" ON "Payment"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

