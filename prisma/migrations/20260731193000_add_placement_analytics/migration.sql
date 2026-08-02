ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'PLACEMENT_IMPRESSION';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'PLACEMENT_CLICK';

ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "placementId" TEXT;

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_placementId_eventType_createdAt_idx"
ON "AnalyticsEvent"("placementId", "eventType", "createdAt");

ALTER TABLE "AnalyticsEvent"
ADD CONSTRAINT "AnalyticsEvent_placementId_fkey"
FOREIGN KEY ("placementId") REFERENCES "Placement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
