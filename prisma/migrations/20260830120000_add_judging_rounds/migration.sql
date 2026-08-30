-- Round 1 is the group stage, round 2 is the finals. A judge scores a team once per round.
ALTER TABLE "Hackathon" ADD COLUMN IF NOT EXISTS "currentRound" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Judge" ADD COLUMN IF NOT EXISTS "round1SubmittedAt" TIMESTAMP(3);
ALTER TABLE "Judge" ADD COLUMN IF NOT EXISTS "round2SubmittedAt" TIMESTAMP(3);

ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "isFinalist" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Score" ADD COLUMN IF NOT EXISTS "round" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Score" ADD COLUMN IF NOT EXISTS "iterationScore" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "Score_applicationId_judgeId_key";
DROP INDEX IF EXISTS "Score_hackathonId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Score_applicationId_judgeId_round_key" ON "Score"("applicationId", "judgeId", "round");
CREATE INDEX IF NOT EXISTS "Score_hackathonId_round_idx" ON "Score"("hackathonId", "round");
