PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Judge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "hackathonId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Judge_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Judge" ("id", "hackathonId", "name", "email", "createdAt", "updatedAt")
SELECT "id", "hackathonId", "name", NULLIF("email", ''), "createdAt", "updatedAt"
FROM "Judge";

DROP TABLE "Judge";
ALTER TABLE "new_Judge" RENAME TO "Judge";

CREATE INDEX "Judge_hackathonId_email_idx" ON "Judge"("hackathonId", "email");

PRAGMA foreign_keys=ON;
