import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canChangeOwner } from "@/lib/auth";
import { sendTeamsMessage } from "@/lib/teams";
import { emailOwnerChanged } from "@/lib/email";

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
  const { newOwnerId, newOwnerName } = body;

  if (!newOwnerName) {
    return NextResponse.json({ error: "Nowy pracownik odpowiedzialny jest wymagany" }, { status: 400 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (caseRecord.status === "ZAMKNIETE") {
    return NextResponse.json({ error: "Sprawa jest już zamknięta" }, { status: 400 });
  }

  if (!canChangeOwner(session, caseRecord)) {
    return NextResponse.json({ error: "Brak uprawnień do zmiany pracownika odpowiedzialnego" }, { status: 403 });
  }

  const oldOwner = caseRecord.owner || "nieprzypisany";

  const [updated] = await prisma.$transaction([
    prisma.case.update({
      where: { id },
      data: { owner: newOwnerName, ownerId: newOwnerId || null },
    }),
    prisma.caseHistory.create({
      data: { caseId: id, changedBy: session.fullName, field: "owner", oldValue: oldOwner, newValue: newOwnerName },
    }),
  ]);

  // Teams: kanał
  await sendTeamsMessage(
    "🔄 Zmiana odpowiedzialnego",
    `**${caseRecord.client}** — ${caseRecord.topic}\n\n**${oldOwner}** → **${newOwnerName}**\n\nZmienił/a: ${session.fullName}`
  );

  // Email: do NOWEGO ownera
  await emailOwnerChanged({ client: caseRecord.client, topic: caseRecord.topic, newOwnerId: newOwnerId || null, dept: caseRecord.dept, caseId: id });

  return NextResponse.json(updated);
}
