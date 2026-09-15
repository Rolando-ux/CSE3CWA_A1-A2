import { NextResponse } from "next/server";
import { prisma, resolvePhonemeSymbolIds } from "../../../../lib/prisma";
import { handleApiError } from "../../../../lib/apiError";
import { parseId, parseWordInput, ValidationError } from "../../../../lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const wordListId = parseId((await params).id);
    const wordList = await prisma.wordList.findUnique({ where: { id: wordListId } });
    if (!wordList) {
      throw new ValidationError("Word list not found.");
    }

    const body = await request.json();
    const input = parseWordInput(body, wordList.difficulty);
    const symbolIds = await resolvePhonemeSymbolIds(input.phonemes);

    const word = await prisma.word.create({
      data: {
        text: input.text,
        wordListId,
        phonemes: {
          create: input.phonemes.map((symbol, position) => ({
            symbol,
            position,
            phonemeSymbolId: symbolIds.get(symbol) ?? null,
          })),
        },
      },
      include: { phonemes: { orderBy: { position: "asc" } } },
    });

    return NextResponse.json({ data: word }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError && err.message === "Word list not found.") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return handleApiError(err);
  }
}
