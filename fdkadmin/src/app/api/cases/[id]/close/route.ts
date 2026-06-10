import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { sendTeamsMessage, formatDeadline } from "@/lib/teams";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { note } = body;

  if (!note || note.trim().length === 0) {
    return NextResponse.json(
      { error: "Komentarz jest wymagany przy zamykaniu sprawy" },
      { status: 400 }
    );
  }

  const caseRecord = await prisma.case.findUnique({ where: { id } });

  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (caseRecord.status === "ZAMKNIETE") {
    return NextResponse.json({ error: "Sprawa jest już zamknięta" }, { status: 400 });
  }

  const closedAt = new Date();
  const isOverdue = closedAt > caseRecord.deadline;

  const updated = await prisma.case.update({
    where: { id },
    data: {
      status: "ZAMKNIETE",
      closedAt,
      note: note.trim(),
    },
  });

  await sendTeamsMessage(
    `✅ Sprawa zamknięta${isOverdue ? " ⚠ PO DEADLINE" : ""}`,
    `**${caseRecord.client}** — ${caseRecord.topic}\n\nOdpowiedź: **${formatDeadline(closedAt)}**${isOverdue ? "\n\n⚠ Sprawa została zamknięta po przekroczeniu deadline'u!" : ""}\n\nKomentarz: ${note.trim()}`
  );

  return NextResponse.json(updated);
}
