import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const databasePath = databaseUrl.replace(/^file:/, "");
const absoluteDatabasePath = databasePath.startsWith("/")
  ? databasePath
  : join(root, databasePath);
const migrationPath = join(
  root,
  "prisma",
  "migrations",
  "20260630153500_init",
  "migration.sql",
);

mkdirSync(dirname(absoluteDatabasePath), { recursive: true });

const db = new Database(absoluteDatabasePath);
const migration = readFileSync(migrationPath, "utf8");

db.exec(migration);

const taskColumns = db
  .prepare("PRAGMA table_info('Task')")
  .all()
  .map((column) => column.name);

if (!taskColumns.includes("completed")) {
  db.exec('ALTER TABLE "Task" ADD COLUMN "completed" BOOLEAN NOT NULL DEFAULT false');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS "BudgetEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathonId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BudgetEntry_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS "BudgetEntry_hackathonId_type_idx" ON "BudgetEntry"("hackathonId", "type");
`);

db.close();

console.log(`SQLite database ready at ${absoluteDatabasePath}`);
