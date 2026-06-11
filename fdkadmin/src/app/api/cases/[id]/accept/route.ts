import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canSetDeadline } from "@/lib/auth";
import { sendTeamsMessage } from "@/lib/teams";

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
  const { responseTime } = body;

  if (!responseTime || ![1, 2, 3].includes(responseTime)) {
    return NextResponse.json({ error: "Czas reakcji musi wynosić 1, 2 lub 3 godziny" }, { status: 400 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (!canSetDeadline(session, caseRecord)) {
    return NextResponse.json({ error: "Brak uprawnień do przyjęcia zgłoszenia" }, { status: 403 });
  }

  if (caseRecord.status !== "ZGLOSZONA" && caseRecord.status !== "OCZEKUJE_NA_DEADLINE") {
    return NextResponse.json({ error: "Sprawa została już przyjęta" }, { status: 400 });
  }

  const now = new Date();
  const genderSuffix = session.gender === "K" ? "ęła" : "ął";

  // Pkt 9: accepting = taking ownership
  const previousOwner = caseRecord.owner;
  const ownerChanged = caseRecord.ownerId !== session.userId;

  const txOps = [
    prisma.case.update({
      where: { id },
      data: {
        responseTime,
        acceptedAt: now,
        acceptedBy: session.fullName,
        owner: session.fullName,
        ownerId: session.userId,
        previousStatus: caseRecord.status,
        status: "PRZYJETA",
      },
    }),
  ];

  // Log owner change in history if different
  if (ownerChanged && previousOwner) {
    txOps.push(
      prisma.caseHistory.create({
        data: {
          caseId: id,
          changedBy: session.fullName,
          field: "owner (przyjęcie)",
          oldValue: previousOwner,
          newValue: session.fullName,
        },
      }) as never
    );
  }

  const [updated] = await prisma.$transaction(txOps);

  // Teams notification
  let teamsText = `**${session.fullName}** przyjął${genderSuffix} sprawę **${caseRecord.client}**\n\nCzas reakcji: **${responseTime}h**\n\nW sprawie: ${caseRecord.topic}`;
  if (ownerChanged && previousOwner) {
    teamsText += `\n\n🔄 Zmiana odpowiedzialnego: ${previousOwner} → ${session.fullName}`;
  }

  await sendTeamsMessage("✔ Sprawa przyjęta", teamsText);

  return NextResponse.json(updated);
}
