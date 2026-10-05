import { NextResponse } from "next/server";
import { handleApiError } from "../../lib/apiError";
import { getStats } from "../../lib/stats";

// Everything the dashboard shows, in one response.
export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleApiError(err);
  }
}
