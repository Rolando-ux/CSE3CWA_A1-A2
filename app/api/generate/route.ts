import { NextResponse } from "next/server";
import { handleApiError } from "../../lib/apiError";
import { GenerationError, generateActivity } from "../../lib/generateActivity";
import { logEvent, logGeneration } from "../../lib/metrics";
import { parseGenerateInput, ValidationError, type GenerateInput } from "../../lib/validation";

export async function POST(request: Request) {
  const startedAt = performance.now();

  let input: GenerateInput;
  try {
    input = parseGenerateInput(await request.json());
  } catch (err) {
    // Bad input never reaches generation, so it is recorded as an invalid-data
    // event rather than a failed generation.
    if (err instanceof ValidationError || err instanceof SyntaxError) {
      await logEvent({
        type: "VALIDATION_ERROR",
        detail:
          err instanceof ValidationError ? err.message : "Malformed JSON body",
      });
    }
    return handleApiError(err);
  }

  try {
    const { html, filename } = await generateActivity(input);
    await logGeneration({
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
