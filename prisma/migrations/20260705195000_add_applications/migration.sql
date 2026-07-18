CREATE TABLE "Application" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "hackathonId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "participantsFullName" TEXT NOT NULL,
  "githubRepoUrl" TEXT NOT NULL,
  "builtDescription" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Application_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Application_hackathonId_createdAt_idx" ON "Application"("hackathonId", "createdAt");
