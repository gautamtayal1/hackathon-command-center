ALTER TABLE "Judge" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Judge_hackathonId_groupId_sortOrder_idx" ON "Judge"("hackathonId", "groupId", "sortOrder");
