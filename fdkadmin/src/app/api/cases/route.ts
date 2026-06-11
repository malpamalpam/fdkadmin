import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { sendTeamsMessage } from "@/lib/teams";

const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry",
  ADMINISTRACJA: "Administracja",
  KONTAKT: "Kontakt",
  HR: "HR",
  KSIEGOWOSC: "Księgowość",
  B2B: "B2B",
  OPLATY: "Opłaty",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Telefon",
  EMAIL: "E-mail",
  SMS: "SMS",
};

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const showClosed = url.searchParams.get("closed") === "true";

  // Build where clause based on role
  let roleFilter = {};
  if (session.role === "EMPLOYEE") {
    const orConditions: Record<string, unknown>[] = [
      { takerId: session.userId },
      { ownerId: session.userId },
    ];
    if (session.dept) {
      orConditions.push({ dept: session.dept });
    }
    roleFilter = { OR: orConditions };
  }

  if (showClosed) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cases = await prisma.case.findMany({
      where: {
        status: "ZAMKNIETE",
        closedAt: { gte: thirtyDaysAgo },
        ...roleFilter,
      },
      orderBy: { closedAt: "desc" },
    });
    return NextResponse.json(cases);
  }

  const cases = await prisma.case.findMany({
    where: {
      status: { not: "ZAMKNIETE" },
      ...roleFilter,
    },
    orderBy: [
      // Cases without deadline first (OCZEKUJE_NA_DEADLINE)
      { deadline: { sort: "asc", nulls: "first" } },
    ],
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channel, client, topic, dept, owner, ownerId, salutation, language } = body;

  if (!channel || !client || !topic || !dept || !salutation) {
    return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
  }

  // New flow: no deadline at creation, status = OCZEKUJE_NA_DEADLINE
  const newCase = await prisma.case.create({
    data: {
      channel,
      taker: session.fullName,
      takerId: session.userId,
      client,
      topic,
      dept,
      owner: owner || null,
      ownerId: ownerId || null,
      salutation: salutation || "PAN",
      language: language || "PL",
      status: "OCZEKUJE_NA_DEADLINE",
    },
  });

  const ownerDisplay = owner || "nieprzypisany";
  await sendTeamsMessage(
    "🆕 Nowe zgłoszenie",
    `**Beneficjent:** ${client}\n\n**W sprawie:** ${topic}\n\n**Dział:** ${DEPT_LABELS[dept] || dept} → ${ownerDisplay}\n\n**Kanał:** ${CHANNEL_LABELS[channel] || channel}\n\n**Przyjął/a:** ${session.fullName}\n\n**${ownerDisplay}: wyznacz deadline!**`
  );

  return NextResponse.json(newCase, { status: 201 });
}
