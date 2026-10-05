import type {
  ActivityType,
  GenerationStatus,
  UsageEventType,
} from "../generated/prisma/client";
import { checkHealth, type HealthReport } from "./health";
import { prisma } from "./prisma";

// Alert thresholds. Kept together so they are easy to find and explain.
const CHART_DAYS = 30;
const RECENT_WINDOW_DAYS = 7;
const FAILURE_RATE_WARNING_PCT = 15;
const FAILURE_RATE_MIN_ATTEMPTS = 10; // too few attempts make a rate meaningless
const VALIDATION_ERRORS_WARNING = 5; // in the last 24 hours
const DAY_MS = 24 * 60 * 60 * 1000;

export type AlertLevel = "error" | "warning" | "info";

export type Alert = {
  level: AlertLevel;
  code: string;
  message: string;
};

export type DailyPoint = {
  date: string; // YYYY-MM-DD in the server's local time
  success: number;
  failure: number;
  wordle: number;
  wordSearch: number;
};

export type Stats = {
  generatedAt: string;
  health: HealthReport;
  totals: {
    wordLists: number;
    words: number;
    /** Activities currently saved in the database. */
    savedActivities: { wordle: number; wordSearch: number; total: number };
    /** Activities ever created, from the usage history (includes deleted). */
    createdActivities: { wordle: number; wordSearch: number; total: number };
  };
  generations: {
    total: number;
    success: number;
    failure: number;
    failureRatePct: number;
    byType: { wordle: number; wordSearch: number };
    mostUsedType: ActivityType | null;
    averageDurationMs: number;
  };
  pageTime: {
    sessions: number;
    averageSeconds: number;
    byPage: { path: string; sessions: number; averageSeconds: number }[];
  };
  failureReasons: { reason: string; count: number }[];
  daily: DailyPoint[];
  recentGenerations: {
    id: number;
    activityType: ActivityType;
    status: GenerationStatus;
    errorReason: string | null;
    durationMs: number;
    createdAt: string;
  }[];
  recentEvents: {
    id: number;
    type: UsageEventType;
    activityType: ActivityType | null;
    detail: string | null;
    createdAt: string;
  }[];
  alerts: Alert[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round1((part / whole) * 100));

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** One entry per day for the last `days` days, zero-filled so charts have no gaps. */
function buildDailySeries(
  logs: { createdAt: Date; status: GenerationStatus; activityType: ActivityType }[],
  days: number,
): DailyPoint[] {
  const points = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = localDateKey(new Date(Date.now() - i * DAY_MS));
    points.set(date, { date, success: 0, failure: 0, wordle: 0, wordSearch: 0 });
  }
  for (const log of logs) {
    const point = points.get(localDateKey(log.createdAt));
    if (!point) continue;
    if (log.status === "SUCCESS") point.success++;
    else point.failure++;
    if (log.activityType === "WORDLE") point.wordle++;
    else point.wordSearch++;
  }
  return [...points.values()];
}

function buildAlerts(input: {
  health: HealthReport;
  recentAttempts: number;
  recentFailures: number;
  emptyListNames: string[];
  validationErrors24h: number;
  generations24h: number;
}): Alert[] {
  const alerts: Alert[] = [];

  if (input.health.status !== "ok") {
    alerts.push({
      level: "error",
      code: "DATABASE_DOWN",
      message: "The database is unreachable. Generation and saving will fail.",
    });
  }

  const recentRate = pct(input.recentFailures, input.recentAttempts);
  if (
    input.recentAttempts >= FAILURE_RATE_MIN_ATTEMPTS &&
    recentRate > FAILURE_RATE_WARNING_PCT
  ) {
    alerts.push({
      level: "warning",
      code: "HIGH_FAILURE_RATE",
      message: `${recentRate}% of generations failed in the last ${RECENT_WINDOW_DAYS} days (${input.recentFailures} of ${input.recentAttempts}).`,
    });
  }

  if (input.emptyListNames.length > 0) {
    alerts.push({
      level: "warning",
      code: "EMPTY_WORD_LIST",
      message: `Empty word list${input.emptyListNames.length > 1 ? "s" : ""}: ${input.emptyListNames.join(", ")}. Activities built from ${input.emptyListNames.length > 1 ? "them" : "it"} will fail to generate.`,
    });
  }

  if (input.validationErrors24h >= VALIDATION_ERRORS_WARNING) {
    alerts.push({
      level: "warning",
      code: "INVALID_DATA",
      message: `${input.validationErrors24h} requests with invalid data were rejected in the last 24 hours.`,
    });
  }

  if (input.generations24h === 0) {
    alerts.push({
      level: "info",
      code: "NO_RECENT_ACTIVITY",
      message: "No activities have been generated in the last 24 hours.",
    });
  }

  return alerts;
}

export async function getStats(): Promise<Stats> {
  const now = Date.now();
  const chartStart = new Date(now - (CHART_DAYS - 1) * DAY_MS);
  chartStart.setHours(0, 0, 0, 0);
  const recentStart = new Date(now - RECENT_WINDOW_DAYS * DAY_MS);
  const dayAgo = new Date(now - DAY_MS);

  const [
    health,
    wordLists,
    words,
    savedByType,
    createdByType,
    generationsByStatus,
    generationsByType,
    durationAvg,
    sessionTotals,
    sessionsByPage,
    failureReasons,
    chartLogs,
    recentGenerations,
    recentEvents,
    recentAttempts,
    recentFailures,
    emptyLists,
    validationErrors24h,
    generations24h,
  ] = await Promise.all([
    checkHealth(),
    prisma.wordList.count(),
    prisma.word.count(),
    prisma.activity.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.usageEvent.groupBy({
      by: ["activityType"],
      where: { type: "ACTIVITY_CREATED" },
      _count: { _all: true },
    }),
    prisma.generationLog.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.generationLog.groupBy({ by: ["activityType"], _count: { _all: true } }),
    prisma.generationLog.aggregate({ _avg: { durationMs: true } }),
    prisma.pageSession.aggregate({
      _avg: { durationSeconds: true },
      _count: { _all: true },
    }),
    prisma.pageSession.groupBy({
      by: ["path"],
      _avg: { durationSeconds: true },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
    }),
    prisma.generationLog.groupBy({
      by: ["errorReason"],
      where: { status: "FAILURE" },
      _count: { _all: true },
      orderBy: { _count: { errorReason: "desc" } },
    }),
    prisma.generationLog.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true, status: true, activityType: true },
    }),
    prisma.generationLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.usageEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.generationLog.count({ where: { createdAt: { gte: recentStart } } }),
    prisma.generationLog.count({
      where: { createdAt: { gte: recentStart }, status: "FAILURE" },
    }),
    prisma.wordList.findMany({ where: { words: { none: {} } }, select: { name: true } }),
    prisma.usageEvent.count({
      where: { type: "VALIDATION_ERROR", createdAt: { gte: dayAgo } },
    }),
    prisma.generationLog.count({ where: { createdAt: { gte: dayAgo } } }),
  ]);

  const countOf = <K extends string>(
    rows: ({ _count: { _all: number } } & Record<K, unknown>)[],
    key: K,
    value: unknown,
  ) => rows.find((r) => r[key] === value)?._count._all ?? 0;

  const saved = {
    wordle: countOf(savedByType, "type", "WORDLE"),
    wordSearch: countOf(savedByType, "type", "WORD_SEARCH"),
  };
  const created = {
    wordle: countOf(createdByType, "activityType", "WORDLE"),
    wordSearch: countOf(createdByType, "activityType", "WORD_SEARCH"),
  };
  const success = countOf(generationsByStatus, "status", "SUCCESS");
  const failure = countOf(generationsByStatus, "status", "FAILURE");
  const total = success + failure;
  const byType = {
    wordle: countOf(generationsByType, "activityType", "WORDLE"),
    wordSearch: countOf(generationsByType, "activityType", "WORD_SEARCH"),
  };

  let mostUsedType: ActivityType | null = null;
  if (byType.wordle !== byType.wordSearch) {
    mostUsedType = byType.wordle > byType.wordSearch ? "WORDLE" : "WORD_SEARCH";
  }

  return {
    generatedAt: new Date(now).toISOString(),
    health,
    totals: {
      wordLists,
      words,
      savedActivities: { ...saved, total: saved.wordle + saved.wordSearch },
      createdActivities: { ...created, total: created.wordle + created.wordSearch },
    },
    generations: {
      total,
      success,
      failure,
      failureRatePct: pct(failure, total),
      byType,
      mostUsedType,
      averageDurationMs: Math.round(durationAvg._avg.durationMs ?? 0),
    },
    pageTime: {
      sessions: sessionTotals._count._all,
      averageSeconds: round1(sessionTotals._avg.durationSeconds ?? 0),
      byPage: sessionsByPage.map((row) => ({
        path: row.path,
        sessions: row._count._all,
        averageSeconds: round1(row._avg.durationSeconds ?? 0),
      })),
    },
    failureReasons: failureReasons.map((row) => ({
      reason: row.errorReason ?? "Unknown",
      count: row._count._all,
    })),
    daily: buildDailySeries(chartLogs, CHART_DAYS),
    recentGenerations: recentGenerations.map((g) => ({
      id: g.id,
      activityType: g.activityType,
      status: g.status,
      errorReason: g.errorReason,
      durationMs: g.durationMs,
      createdAt: g.createdAt.toISOString(),
    })),
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      type: e.type,
      activityType: e.activityType,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    })),
    alerts: buildAlerts({
      health,
      recentAttempts,
      recentFailures,
      emptyListNames: emptyLists.map((l) => l.name),
      validationErrors24h,
      generations24h,
    }),
  };
}
