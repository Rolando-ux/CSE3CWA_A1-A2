import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

// Reused across hot-reloads in dev so we don't open a new SQLite
// connection on every file change.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Looks up PhonemeSymbol ids for a set of phoneme symbols, so WordPhoneme
 * rows can carry the FK link in addition to the raw symbol text.
 */
export async function resolvePhonemeSymbolIds(
  symbols: string[],
): Promise<Map<string, number>> {
  const rows = await prisma.phonemeSymbol.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true },
  });
  return new Map(rows.map((r) => [r.symbol, r.id]));
}
