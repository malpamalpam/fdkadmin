import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canAccessCase } from "@/lib/auth";
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
  const caseRecord = await prisma.case.findUnique({ where: { id } });

  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (!canAccessCase(session, caseRecord)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (caseRecord.extended) {
    return NextResponse.json(
      { error: "Przedłużenie jest możliwe tylko raz" },
      { status: 400 }
    );
  }

  if (caseRecord.status === "ZAMKNIETE") {
    return NextResponse.json({ error: "Sprawa jest już zamknięta" }, { status: 400 });
  }

  if (!caseRecord.deadline) {
    return NextResponse.json({ error: "Sprawa nie ma jeszcze deadline'u" }, { status: 400 });
  }

  const newDeadline = new Date(caseRecord.deadline.getTime() + 60 * 60 * 1000);

  const updated = await prisma.case.update({
    where: { id },
    data: {
      deadline: newDeadline,
      extended: true,
      status: "PRZEDLUZONO",
      alert30Sent: false,
      alertOverSent: false,
    },
  });

  await sendTeamsMessage(
    "⏳ Przedłużenie +1h",
    `**${caseRecord.client}** — ${caseRecord.topic}\n\nNowy deadline: **${formatDeadline(newDeadline)}**\n\nOdpowiada: ${caseRecord.owner || "nieprzypisany"}\n\nPamiętaj o wysłaniu wiadomości o przedłużeniu do beneficjenta!`
  );

  return NextResponse.json(updated);
}
