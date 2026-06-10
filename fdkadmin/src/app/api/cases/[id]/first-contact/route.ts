import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const caseRecord = await prisma.case.findUnique({ where: { id } });

  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (caseRecord.status === "ZAMKNIETE") {
    return NextResponse.json({ error: "Sprawa jest już zamknięta" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      firstContactAt: new Date(),
      status: "KONTAKT_WSTEPNY",
    },
  });

  return NextResponse.json(updated);
}
