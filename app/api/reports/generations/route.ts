import { NextResponse } from "next/server";
import { handleApiError } from "../../../lib/apiError";
import { getGenerationCsv, getGenerationReport } from "../../../lib/reports";
import { parseReportQuery } from "../../../lib/validation";

// GET /api/reports/generations?status=&type=&page=&pageSize=&format=csv
export async function GET(request: Request) {
  try {
    const query = parseReportQuery(new URL(request.url).searchParams);

    if (query.format === "csv") {
      return new Response(await getGenerationCsv(query), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="generation-report.csv"',
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(await getGenerationReport(query), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
