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
  const caseRecord = await prisma.case.findUnique({ where: { id } });

  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
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
    `**${caseRecord.client}** — ${caseRecord.topic}\n\nNowy deadline: **${formatDeadline(newDeadline)}**\n\nOdpowiada: ${caseRecord.owner || "nieprzypisany"}\n\nPamiętaj o ponownym kontakcie z beneficjentem!`
  );

  return NextResponse.json(updated);
}
