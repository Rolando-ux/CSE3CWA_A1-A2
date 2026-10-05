import { NextResponse } from "next/server";
import { prisma, resolvePhonemeSymbolIds } from "../../../lib/prisma";
import { handleApiError } from "../../../lib/apiError";
import { logEvent } from "../../../lib/metrics";
import { parseId, parseWordInput, ValidationError } from "../../../lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const word = await prisma.word.findUnique({
      where: { id },
      include: { phonemes: { orderBy: { position: "asc" } } },
    });
    if (!word) {
      throw new ValidationError("Word not found.");
    }
    return NextResponse.json({ data: word });
  } catch (err) {
    if (err instanceof ValidationError && err.message === "Word not found.") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const existing = await prisma.word.findUnique({
      where: { id },
      include: { wordList: true },
    });
    if (!existing) {
      throw new ValidationError("Word not found.");
    }

    const body = await request.json();
    const input = parseWordInput(body, existing.wordList.difficulty);
    const symbolIds = await resolvePhonemeSymbolIds(input.phonemes);

    const word = await prisma.$transaction(async (tx) => {
      await tx.wordPhoneme.deleteMany({ where: { wordId: id } });
      return tx.word.update({
        where: { id },
        data: {
          text: input.text,
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
    });

    await logEvent({
      type: "WORDLIST_UPDATED",
      detail: `Edited word "${word.text}" in "${existing.wordList.name}"`,
    });
    return NextResponse.json({ data: word });
  } catch (err) {
    if (err instanceof ValidationError && err.message === "Word not found.") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const word = await prisma.word.delete({ where: { id } });
    await logEvent({
      type: "WORDLIST_UPDATED",
      detail: `Removed word "${word.text}"`,
    });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return handleApiError(err);
  }
}
