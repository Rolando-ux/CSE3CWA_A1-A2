import type { ActivityType, GenerationStatus } from "../generated/prisma/client";
import { prisma } from "./prisma";
import type { ReportQuery } from "./validation";

export type GenerationRow = {
  id: number;
  activityType: ActivityType;
  status: GenerationStatus;
  errorReason: string | null;
  durationMs: number;
  createdAt: string;
};

export type GenerationReportPage = {
  data: GenerationRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Hard cap so one export request cannot pull an unbounded table into memory.
const CSV_ROW_LIMIT = 5000;

function whereFor(query: ReportQuery) {
  return {
    ...(query.status && { status: query.status }),
    ...(query.type && { activityType: query.type }),
  };
}

function toRow(log: {
  id: number;
  activityType: ActivityType;
  status: GenerationStatus;
  errorReason: string | null;
  durationMs: number;
  createdAt: Date;
}): GenerationRow {
  return {
    id: log.id,
    activityType: log.activityType,
    status: log.status,
    errorReason: log.errorReason,
    durationMs: log.durationMs,
    createdAt: log.createdAt.toISOString(),
  };
}

/** One page of generation attempts, newest first, optionally filtered. */
export async function getGenerationReport(
  query: ReportQuery,
): Promise<GenerationReportPage> {
  const where = whereFor(query);
  const [total, logs] = await Promise.all([
    prisma.generationLog.count({ where }),
    prisma.generationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: logs.map(toRow),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

// Cells starting with these are treated as formulas by spreadsheet apps.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Every attempt matching the filters (up to a cap) as CSV text. */
export async function getGenerationCsv(query: ReportQuery): Promise<string> {
  const logs = await prisma.generationLog.findMany({
    where: whereFor(query),
    orderBy: { createdAt: "desc" },
    take: CSV_ROW_LIMIT,
  });

  const header = ["id", "time", "activity_type", "status", "error_reason", "duration_ms"];
  const lines = logs.map((log) =>
    [log.id, log.createdAt.toISOString(), log.activityType, log.status, log.errorReason, log.durationMs]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n") + "\r\n";
}
