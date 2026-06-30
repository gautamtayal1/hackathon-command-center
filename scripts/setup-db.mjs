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
db.close();

console.log(`SQLite database ready at ${absoluteDatabasePath}`);
