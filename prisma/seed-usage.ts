import { prisma } from "../app/lib/prisma";
import type {
  ActivityType,
  GenerationStatus,
  UsageEventType,
} from "../app/generated/prisma/client";

// Simulated usage history for the dashboard. Uses a seeded generator so every
// run produces identical data (reproducible demos and tests), and only clears
// the three usage tables so word lists and activities are left alone.

const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(2026);

const between = (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

// Random moment within a given day, biased toward daytime hours. Never in the
// future: a record "from today" that is dated later than now would sort above
// real activity in newest-first views.
function timeOnDay(daysAgo: number): Date {
  const hour = between(8, 20);
  const day = new Date(Date.now() - daysAgo * DAY_MS);
  day.setHours(hour, between(0, 59), between(0, 59), 0);
  if (day.getTime() > Date.now()) {
    return new Date(Date.now() - between(1, 3 * 60 * 60) * 1000);
  }
  return day;
}

const FAILURE_REASONS: Record<ActivityType, string[]> = {
  WORDLE: ["Word list is empty", "Word has no phoneme data"],
  WORD_SEARCH: [
    "Word does not fit in grid - try a bigger grid",
    "Word list is empty",
    "Word has no phoneme data",
  ],
};

const PAGES = [
  { path: "/", weight: 5, minSeconds: 8, maxSeconds: 60 },
  { path: "/wordle", weight: 8, minSeconds: 45, maxSeconds: 420 },
  { path: "/word-search", weight: 6, minSeconds: 45, maxSeconds: 380 },
  { path: "/dashboard", weight: 4, minSeconds: 30, maxSeconds: 240 },
  { path: "/about", weight: 2, minSeconds: 15, maxSeconds: 150 },
  { path: "/settings", weight: 1, minSeconds: 5, maxSeconds: 45 },
];

function pickPage() {
  const total = PAGES.reduce((sum, p) => sum + p.weight, 0);
  let roll = random() * total;
  for (const page of PAGES) {
    roll -= page.weight;
    if (roll < 0) return page;
  }
  return PAGES[0];
}

async function main() {
  await prisma.generationLog.deleteMany();
  await prisma.pageSession.deleteMany();
  await prisma.usageEvent.deleteMany();

  const activities = await prisma.activity.findMany({
    select: { id: true, type: true },
  });
  if (activities.length === 0) {
    throw new Error("No activities found - run `npm run db:seed` first.");
  }

  const generationLogs: {
    activityId: number;
    activityType: ActivityType;
    status: GenerationStatus;
    errorReason: string | null;
    durationMs: number;
    createdAt: Date;
  }[] = [];
  const pageSessions: { path: string; durationSeconds: number; createdAt: Date }[] = [];
  const usageEvents: {
    type: UsageEventType;
    activityType: ActivityType | null;
    detail: string | null;
    createdAt: Date;
  }[] = [];

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayOfWeek = new Date(Date.now() - daysAgo * DAY_MS).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const busyness = isWeekend ? 0.4 : 1;

    // Usage grows slightly over the month so trends are visible.
    const growth = 1 + (DAYS - daysAgo) / DAYS;

    const generationCount = Math.round(between(4, 12) * busyness * growth);
    for (let i = 0; i < generationCount; i++) {
      const activity = pick(
        random() < 0.58
          ? activities.filter((a) => a.type === "WORDLE")
          : activities.filter((a) => a.type === "WORD_SEARCH"),
      );
      const failureChance = activity.type === "WORD_SEARCH" ? 0.14 : 0.06;
      const failed = random() < failureChance;
      generationLogs.push({
        activityId: activity.id,
        activityType: activity.type,
        status: failed ? "FAILURE" : "SUCCESS",
        errorReason: failed ? pick(FAILURE_REASONS[activity.type]) : null,
        durationMs: failed ? between(5, 40) : between(20, 180),
        createdAt: timeOnDay(daysAgo),
      });
    }

    const sessionCount = Math.round(between(10, 30) * busyness * growth);
    for (let i = 0; i < sessionCount; i++) {
      const page = pickPage();
      pageSessions.push({
        path: page.path,
        durationSeconds: between(page.minSeconds, page.maxSeconds),
        createdAt: timeOnDay(daysAgo),
      });
    }

    const createdCount = Math.round(between(0, 3) * busyness);
    for (let i = 0; i < createdCount; i++) {
      const type: ActivityType = random() < 0.58 ? "WORDLE" : "WORD_SEARCH";
      usageEvents.push({
        type: "ACTIVITY_CREATED",
        activityType: type,
        detail: `Created ${type === "WORDLE" ? "Wordle" : "Word Search"} activity`,
        createdAt: timeOnDay(daysAgo),
      });
    }
    if (random() < 0.3 * busyness) {
      usageEvents.push({
        type: "ACTIVITY_UPDATED",
        activityType: pick(["WORDLE", "WORD_SEARCH"] as const),
        detail: "Changed activity settings",
        createdAt: timeOnDay(daysAgo),
      });
    }
    if (random() < 0.15 * busyness) {
      usageEvents.push({
        type: "WORDLIST_CREATED",
        activityType: null,
        detail: "Created word list",
        createdAt: timeOnDay(daysAgo),
      });
    }
    if (random() < 0.1 * busyness) {
      usageEvents.push({
        type: "ACTIVITY_DELETED",
        activityType: pick(["WORDLE", "WORD_SEARCH"] as const),
        detail: "Deleted activity",
        createdAt: timeOnDay(daysAgo),
      });
    }
    if (random() < 0.2 * busyness) {
      usageEvents.push({
        type: "VALIDATION_ERROR",
        activityType: null,
        detail: pick([
          "Phoneme symbol not in keyboard",
          "Word has no phonemes",
          "Guess count out of range",
        ]),
        createdAt: timeOnDay(daysAgo),
      });
    }
  }

  await prisma.generationLog.createMany({ data: generationLogs });
  await prisma.pageSession.createMany({ data: pageSessions });
  await prisma.usageEvent.createMany({ data: usageEvents });

  const failures = generationLogs.filter((g) => g.status === "FAILURE").length;
  console.log(
    `Seeded ${generationLogs.length} generation logs (${failures} failures), ` +
      `${pageSessions.length} page sessions, ${usageEvents.length} usage events.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
