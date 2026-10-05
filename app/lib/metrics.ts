import { prisma } from "./prisma";
import type {
  ActivityType,
  GenerationStatus,
  UsageEventType,
} from "../generated/prisma/client";

// Write-side helpers for the observability tables. Every function swallows
// its own errors: a failed metrics write must never break the request that
// triggered it (a teacher should still get their activity).

function warn(action: string, err: unknown) {
  console.warn(`[metrics] Could not record ${action}:`, err);
}

export type GenerationRecord = {
  activityId?: number | null;
  activityType: ActivityType;
  status: GenerationStatus;
  errorReason?: string | null;
  durationMs: number;
};

export async function logGeneration(record: GenerationRecord): Promise<void> {
  try {
    await prisma.generationLog.create({
      data: {
        activityId: record.activityId ?? null,
        activityType: record.activityType,
        status: record.status,
        errorReason: record.errorReason ?? null,
        durationMs: Math.max(0, Math.round(record.durationMs)),
      },
    });
  } catch (err) {
    warn("generation", err);
  }
}

export type UsageEventRecord = {
  type: UsageEventType;
  activityType?: ActivityType | null;
  detail?: string | null;
};

export async function logEvent(record: UsageEventRecord): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        type: record.type,
        activityType: record.activityType ?? null,
        detail: record.detail ?? null,
      },
    });
  } catch (err) {
    warn("usage event", err);
  }
}

// Visits longer than this are almost certainly an abandoned tab, not real
// time on page, so they are capped rather than allowed to skew the average.
export const MAX_SESSION_SECONDS = 60 * 60;

export async function logPageSession(
  path: string,
  durationSeconds: number,
): Promise<void> {
  try {
    await prisma.pageSession.create({
      data: {
        path,
        durationSeconds: Math.min(
          MAX_SESSION_SECONDS,
          Math.max(0, Math.round(durationSeconds)),
        ),
      },
    });
  } catch (err) {
    warn("page session", err);
  }
}
