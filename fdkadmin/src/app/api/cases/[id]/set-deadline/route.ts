import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canSetDeadline } from "@/lib/auth";
import { sendTeamsMessage, formatDeadline } from "@/lib/teams";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { deadline } = body;

  if (!deadline) {
    return NextResponse.json({ error: "Deadline jest wymagany" }, { status: 400 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (!canSetDeadline(session, caseRecord)) {
    return NextResponse.json({ error: "Brak uprawnień do wyznaczenia deadline'u" }, { status: 403 });
  }

  if (caseRecord.status !== "OCZEKUJE_NA_DEADLINE") {
    return NextResponse.json({ error: "Deadline został już wyznaczony" }, { status: 400 });
  }

  // Validate deadline: max 3h from NOW (moment of setting)
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const maxDeadline = new Date(now.getTime() + 3 * 60 * 60 * 1000 + 60 * 1000);

  if (deadlineDate > maxDeadline) {
    return NextResponse.json(
      { error: "Deadline nie może przekraczać 3 godzin od momentu wyznaczenia" },
      { status: 400 }
    );
  }

  if (deadlineDate < now) {
    return NextResponse.json(
      { error: "Deadline nie może być w przeszłości" },
      { status: 400 }
    );
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      deadline: deadlineDate,
      deadlineSetAt: now,
      deadlineSetBy: session.fullName,
      status: "NOWE",
    },
  });

  await sendTeamsMessage(
    "⏰ Deadline wyznaczony",
    `**${caseRecord.client}** — ${caseRecord.topic}\n\n**Deadline:** ${formatDeadline(deadlineDate)}\n\n**Wyznaczył/a:** ${session.fullName}`
  );

  return NextResponse.json(updated);
}
