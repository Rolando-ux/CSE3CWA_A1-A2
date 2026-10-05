import { NextResponse } from "next/server";
import { checkHealth } from "../../lib/health";

// Also served at /health (see the rewrite in next.config.ts).
export async function GET() {
  const report = await checkHealth();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
