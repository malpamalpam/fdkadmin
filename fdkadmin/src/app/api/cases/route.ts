import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { sendTeamsAdaptiveCard } from "@/lib/teams";
import { sendEmail, buildCaseEmailHtml } from "@/lib/email";
import { DEPT_LABELS, CHANNEL_LABELS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const showClosed = url.searchParams.get("closed") === "true";
  const filterDept = url.searchParams.get("dept");
  const filterClient = url.searchParams.get("client");

  // RBAC filter
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

  // User filters
  const userFilters: Record<string, unknown>[] = [];
  if (filterDept) userFilters.push({ dept: filterDept });
  if (filterClient) userFilters.push({ client: { contains: filterClient, mode: "insensitive" } });

  const andConditions = userFilters.length > 0 ? { AND: userFilters } : {};

  if (showClosed) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cases = await prisma.case.findMany({
      where: {
        status: "ZAMKNIETE",
        closedAt: { gte: thirtyDaysAgo },
        ...roleFilter,
        ...andConditions,
      },
      orderBy: { closedAt: "desc" },
    });
    return NextResponse.json(cases);
  }

  const cases = await prisma.case.findMany({
    where: {
      status: { not: "ZAMKNIETE" },
      ...roleFilter,
      ...andConditions,
    },
    orderBy: [
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
      status: "ZGLOSZONA",
    },
  });

  const ownerDisplay = owner || "nieprzypisany";
  const deptLabel = DEPT_LABELS[dept] || dept;

  // Teams notification with @mention for owner
  const mentions: { name: string; upn: string }[] = [];
  if (ownerId) {
    const ownerUser = await prisma.user.findUnique({ where: { id: ownerId } });
    if (ownerUser?.teamsUpn) {
      mentions.push({ name: ownerUser.fullName, upn: ownerUser.teamsUpn });
    }
  }

  await sendTeamsAdaptiveCard(
    "🆕 Nowa sprawa",
    `**Beneficjent:** ${client}\n\n**W sprawie:** ${topic}\n\n**Dział:** ${deptLabel} → **${ownerDisplay}**\n\n**Kanał:** ${CHANNEL_LABELS[channel] || channel}\n\n**Zgłosił/a:** ${session.fullName}\n\n**${ownerDisplay}: przyjmij zgłoszenie!**`,
    mentions
  );

  // Email: to all department mailboxes + owner's personal email
  const emailTo: string[] = [];
  const deptConfig = await prisma.departmentConfig.findUnique({ where: { code: dept } });
  if (deptConfig?.emails?.length) emailTo.push(...deptConfig.emails);
  else if (deptConfig?.email) emailTo.push(deptConfig.email); // legacy fallback
  if (ownerId) {
    const ownerUser = await prisma.user.findUnique({ where: { id: ownerId } });
    if (ownerUser?.email) emailTo.push(ownerUser.email);
  }

  if (emailTo.length > 0) {
    await sendEmail({
      to: emailTo,
      subject: `Nowa sprawa: ${client} — ${topic}`,
      html: buildCaseEmailHtml({
        title: "Nowa sprawa w rejestrze",
        client,
        topic,
        dept: deptLabel,
        owner: ownerDisplay,
        caseId: newCase.id,
      }),
    });
    await prisma.case.update({
      where: { id: newCase.id },
      data: { emailNewSent: true },
    });
  }

  return NextResponse.json(newCase, { status: 201 });
}
