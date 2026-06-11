import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canAccessCase } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const caseRecord = await prisma.case.findUnique({ where: { id } });

  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (!canAccessCase(session, caseRecord)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (caseRecord.status === "ZAMKNIETE") {
    return NextResponse.json({ error: "Sprawa jest już zamknięta" }, { status: 400 });
  }

  if (caseRecord.firstContactSentAt) {
    return NextResponse.json({ error: "Kontakt wstępny już oznaczony jako wysłany" }, { status: 400 });
  }

  const now = new Date();

  // Compute deadline: firstContactSentAt + responseTime hours
  let deadline = caseRecord.deadline; // keep existing if already set (legacy cases)
  if (caseRecord.responseTime && !caseRecord.deadline) {
    deadline = new Date(now.getTime() + caseRecord.responseTime * 60 * 60 * 1000);
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      firstContactAt: caseRecord.firstContactAt || now,
      firstContactSentAt: now,
      deadline,
      deadlineSetAt: deadline ? now : undefined,
      deadlineSetBy: deadline ? session.fullName : undefined,
      previousStatus: caseRecord.status,
      status: "KONTAKT_WSTEPNY",
    },
  });

  return NextResponse.json(updated);
}
