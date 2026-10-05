import { NextResponse } from "next/server";
import { logEvent } from "./metrics";
import { ValidationError } from "./validation";

const PRISMA_NOT_FOUND = "P2025";
const PRISMA_FOREIGN_KEY_FAILED = "P2003";

function isPrismaKnownError(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

/**
 * Turns a thrown error into the right JSON response. Invalid input is also
 * recorded as a VALIDATION_ERROR usage event so the dashboard can warn about
 * it - done here once, so every route is covered.
 */
export async function handleApiError(err: unknown): Promise<NextResponse> {
  if (err instanceof ValidationError) {
    await logEvent({ type: "VALIDATION_ERROR", detail: err.message });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (err instanceof SyntaxError) {
    await logEvent({ type: "VALIDATION_ERROR", detail: "Malformed JSON body" });
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (isPrismaKnownError(err)) {
    if (err.code === PRISMA_NOT_FOUND) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (err.code === PRISMA_FOREIGN_KEY_FAILED) {
      return NextResponse.json(
        { error: "Referenced record does not exist (e.g. wordListId)." },
        { status: 400 },
      );
    }
  }

  console.error(err);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
