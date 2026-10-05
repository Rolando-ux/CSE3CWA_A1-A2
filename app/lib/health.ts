import { prisma } from "./prisma";

export type HealthReport = {
  status: "ok" | "error";
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: "up" | "down";
    /** Round-trip time of a trivial query, in milliseconds. */
    latencyMs: number | null;
  };
  /** Row counts as a quick sanity check that the data is present. */
  records: {
    wordLists: number;
    words: number;
    activities: number;
    generationLogs: number;
  } | null;
};

/**
 * Checks that the app can reach and query its database. Shared by the
 * /health endpoint and the dashboard so both report the same thing.
 */
export async function checkHealth(): Promise<HealthReport> {
  const base = {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };

  try {
    const started = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - started);

    const [wordLists, words, activities, generationLogs] = await Promise.all([
      prisma.wordList.count(),
      prisma.word.count(),
      prisma.activity.count(),
      prisma.generationLog.count(),
    ]);

    return {
      status: "ok",
      ...base,
      database: { status: "up", latencyMs },
      records: { wordLists, words, activities, generationLogs },
    };
  } catch (err) {
    console.error("[health] Database check failed:", err);
    return {
      status: "error",
      ...base,
      database: { status: "down", latencyMs: null },
      records: null,
    };
  }
}
