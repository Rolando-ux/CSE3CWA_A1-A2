import { NextResponse } from "next/server";
import { handleApiError } from "../../lib/apiError";
import {
  GenerationError,
  generateActivity,
  inputFromActivity,
} from "../../lib/generateActivity";
import { logGeneration } from "../../lib/metrics";
import {
  isActivityGenerateRequest,
  parseActivityGenerateInput,
  parseGenerateInput,
  type GenerateInput,
} from "../../lib/validation";

// Two ways in: explicit settings from a builder, or { activityId } to build
// from a saved activity's stored settings.
export async function POST(request: Request) {
  const startedAt = performance.now();

  let input: GenerateInput;
  let activityId: number | null = null;
  try {
    const body = await request.json();
    if (isActivityGenerateRequest(body)) {
      ({ input, activityId } = await inputFromActivity(parseActivityGenerateInput(body)));
    } else {
      input = parseGenerateInput(body);
    }
  } catch (err) {
    // Bad input never reaches generation: handleApiError returns the 400 and
    // records it as a VALIDATION_ERROR event rather than a failed generation.
    if (err instanceof GenerationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return handleApiError(err);
  }

  try {
    const { html, filename } = await generateActivity(input);
    await logGeneration({
      activityId,
      activityType: input.type,
      status: "SUCCESS",
      durationMs: performance.now() - startedAt,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await logGeneration({
      activityId,
      activityType: input.type,
      status: "FAILURE",
      errorReason:
        err instanceof GenerationError ? err.message : "Unexpected server error",
      durationMs: performance.now() - startedAt,
    });

    if (err instanceof GenerationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return handleApiError(err);
  }
}
