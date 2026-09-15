import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { handleApiError } from "../../../lib/apiError";
import { parseId, parseWordListInput, ValidationError } from "../../../lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const wordList = await prisma.wordList.findUnique({
      where: { id },
      include: {
        words: { include: { phonemes: { orderBy: { position: "asc" } } } },
        activities: true,
      },
    });
    if (!wordList) {
      throw new ValidationError("Word list not found.");
    }
    return NextResponse.json({ data: wordList });
  } catch (err) {
    if (err instanceof ValidationError && err.message === "Word list not found.") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const body = await request.json();
    const input = parseWordListInput(body);
    const wordList = await prisma.wordList.update({ where: { id }, data: input });
    return NextResponse.json({ data: wordList });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    await prisma.wordList.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return handleApiError(err);
  }
}
