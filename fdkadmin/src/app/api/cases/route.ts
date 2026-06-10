import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { sendTeamsMessage, formatDeadline } from "@/lib/teams";

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Telefon",
  EMAIL: "E-mail",
  SMS: "SMS",
};

const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry",
  ADMINISTRACJA: "Administracja",
  KONTAKT: "Kontakt",
  HR: "HR",
  HR_ENG: "HR ENG",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

export async function GET(request: NextRequest) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const showClosed = url.searchParams.get("closed") === "true";

  if (showClosed) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cases = await prisma.case.findMany({
      where: {
        status: "ZAMKNIETE",
        closedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { closedAt: "desc" },
    });
    return NextResponse.json(cases);
  }

  const cases = await prisma.case.findMany({
    where: { status: { not: "ZAMKNIETE" } },
    orderBy: { deadline: "asc" },
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  const { authenticated, worker } = verifyAuth(request);
  if (!authenticated || !worker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channel, client, topic, dept, owner, deadline } = body;

  // Validate required fields
  if (!channel || !client || !topic || !dept || !deadline) {
    return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
  }

  // Validate deadline max 3h from now
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const maxDeadline = new Date(now.getTime() + 3 * 60 * 60 * 1000 + 60 * 1000); // +1 min tolerance

  if (deadlineDate > maxDeadline) {
    return NextResponse.json(
      { error: "Deadline nie może przekraczać 3 godzin od momentu utworzenia" },
      { status: 400 }
    );
  }

  if (deadlineDate < now) {
    return NextResponse.json(
      { error: "Deadline nie może być w przeszłości" },
      { status: 400 }
    );
  }

  const newCase = await prisma.case.create({
    data: {
      channel,
      taker: worker,
      client,
      topic,
      dept,
      owner: owner || null,
      deadline: deadlineDate,
    },
  });

  // Send Teams notification
  await sendTeamsMessage(
    "📋 Nowe zgłoszenie",
    `**Beneficjent:** ${client}\n\n**W sprawie:** ${topic}\n\n**Dział:** ${DEPT_LABELS[dept] || dept}${owner ? ` → ${owner}` : ""}\n\n**Kanał:** ${CHANNEL_LABELS[channel] || channel}\n\n**Przyjął/a:** ${worker}\n\n**Deadline:** ${formatDeadline(deadlineDate)}`
  );

  return NextResponse.json(newCase, { status: 201 });
}
