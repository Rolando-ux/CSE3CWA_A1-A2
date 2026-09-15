import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { handleApiError } from "../../lib/apiError";
import { parseActivityInput } from "../../lib/validation";

export async function GET() {
  const activities = await prisma.activity.findMany({
    include: { wordList: { select: { id: true, name: true, difficulty: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: activities });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseActivityInput(body);
    const activity = await prisma.activity.create({ data: input });
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
