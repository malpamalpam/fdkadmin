import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canAccessCase } from "@/lib/auth";
import { sendTeamsMessage, formatDeadline } from "@/lib/teams";
import { emailCaseClosed } from "@/lib/email";

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
  const { note } = body;

  if (!note || note.trim().length === 0) {
    return NextResponse.json({ error: "Komentarz jest wymagany przy zamykaniu sprawy" }, { status: 400 });
  }

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

  const closedAt = new Date();
  const isOverdue = caseRecord.deadline ? closedAt > caseRecord.deadline : false;

  const updated = await prisma.case.update({
    where: { id },
    data: { previousStatus: caseRecord.status, status: "ZAMKNIETE", closedAt, note: note.trim() },
  });

  // Teams: kanał
  await sendTeamsMessage(
    `✅ Sprawa zamknięta${isOverdue ? " ⚠ PO DEADLINE" : ""}`,
    `**${caseRecord.client}** — ${caseRecord.topic}\n\nOdpowiedź: **${formatDeadline(closedAt)}**${isOverdue ? "\n\n⚠ Sprawa została zamknięta po przekroczeniu deadline'u!" : ""}\n\nKomentarz: ${note.trim()}`
  );

  // Email: do zgłaszającego (taker)
  await emailCaseClosed({ client: caseRecord.client, topic: caseRecord.topic, takerId: caseRecord.takerId, note: note.trim(), caseId: id });

  return NextResponse.json(updated);
}
