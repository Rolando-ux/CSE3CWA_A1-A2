import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { handleApiError } from "../../../lib/apiError";
import { parseActivityInput, parseId, ValidationError } from "../../../lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        wordList: {
          include: { words: { include: { phonemes: { orderBy: { position: "asc" } } } } },
        },
      },
    });
    if (!activity) {
      throw new ValidationError("Activity not found.");
    }
    return NextResponse.json({ data: activity });
  } catch (err) {
    if (err instanceof ValidationError && err.message === "Activity not found.") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    const body = await request.json();
    const input = parseActivityInput(body);
    const activity = await prisma.activity.update({ where: { id }, data: input });
    return NextResponse.json({ data: activity });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const id = parseId((await params).id);
    await prisma.activity.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return handleApiError(err);
  }
}
