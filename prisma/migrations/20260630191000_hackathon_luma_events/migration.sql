ALTER TABLE "Hackathon" ADD COLUMN "lumaUrl" TEXT;
ALTER TABLE "Hackathon" ADD COLUMN "startsAt" DATETIME;
ALTER TABLE "Hackathon" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Hackathon_isActive_startsAt_idx" ON "Hackathon"("isActive", "startsAt");
