import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const adapter = new PrismaPg(databaseUrl);

  return new PrismaClient({
    adapter,
  });
}

// Lazily instantiate the client on first use so that merely importing this
// module (e.g. during `next build` page-data collection) does not require
// DATABASE_URL — it is only needed when a query actually runs.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client =
      globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

    return Reflect.get(client, prop, receiver);
  },
});
