-- CreateTable
CREATE TABLE "LeadEnrichmentCache" (
    "externalId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEnrichmentCache_pkey" PRIMARY KEY ("externalId")
);

