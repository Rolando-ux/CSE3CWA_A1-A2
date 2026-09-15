import { NextResponse } from "next/server";
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

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (err instanceof SyntaxError) {
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
