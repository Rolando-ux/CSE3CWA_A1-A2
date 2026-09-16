import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { handleApiError } from "../../lib/apiError";
import { parseWordListInput } from "../../lib/validation";

export async function GET(request: Request) {
  const includeWords = new URL(request.url).searchParams.get("include") === "words";

  const wordLists = await prisma.wordList.findMany({
    include: includeWords
      ? { words: { include: { phonemes: { orderBy: { position: "asc" } } } } }
      : { _count: { select: { words: true, activities: true } } },
    orderBy: { difficulty: "asc" },
  });
  return NextResponse.json({ data: wordLists });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseWordListInput(body);
    const wordList = await prisma.wordList.create({ data: input });
    return NextResponse.json({ data: wordList }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
