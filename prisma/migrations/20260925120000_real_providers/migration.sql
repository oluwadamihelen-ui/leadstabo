-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "Inbox" ADD COLUMN     "imapLastUid" INTEGER,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "messageId" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_externalRef_key" ON "CreditTransaction"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "Reply_workspaceId_messageId_key" ON "Reply"("workspaceId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

