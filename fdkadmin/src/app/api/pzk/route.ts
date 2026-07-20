import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { PzkClientType, PzkPanel } from "@/lib/pzk-types";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const panel = url.searchParams.get("panel") as PzkPanel | null;
  const month = url.searchParams.get("month"); // "YYYY-MM"
  const search = url.searchParams.get("q");

  const showWithdrawn = url.searchParams.get("withdrawn") === "true";

  const where: Record<string, unknown> = {};
  if (panel) where.panel = panel;
  if (!showWithdrawn) where.withdrawnFromNotice = false;

  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    where.cooperationEndsAt = { gte: start, lt: end };
  }

  if (search) {
    where.OR = [
      { lastName: { contains: search, mode: "insensitive" } },
      { firstNames: { contains: search, mode: "insensitive" } },
      { benefEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const cases = await prisma.pzkCase.findMany({
    where,
    orderBy: { cooperationEndsAt: { sort: "asc", nulls: "last" } },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      panel: true,
      lastName: true,
      firstNames: true,
      benefEmail: true,
      clientType: true,
      responsibleWorker: true,
      cooperationEndsAt: true,
      withdrawnFromNotice: true,
      caseClosed: true,
      createdByName: true,
      emailInitialSent: true,
      emailMid15Sent: true,
      emailFinal28Sent: true,
      mod1Closed: true,
      mod2Closed: true,
      mod3AClosed: true,
      mod3BClosed: true,
      mod4Closed: true,
      mod5Closed: true,
      mod6Closed: true,
      mod7AClosed: true,
      mod7BClosed: true,
      mod8Closed: true,
    },
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    panel,
    lastName,
    firstNames,
    benefEmail,
    clientType,
    responsibleWorker,
    cooperationEndsAt,
  } = body as {
    panel: PzkPanel;
    lastName: string;
    firstNames: string;
    benefEmail?: string;
    clientType: PzkClientType;
    responsibleWorker?: string;
    cooperationEndsAt?: string;
  };

  if (!panel || !lastName || !firstNames || !clientType) {
    return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
  }

  const newCase = await prisma.pzkCase.create({
    data: {
      panel,
      lastName,
      firstNames,
      benefEmail: benefEmail || null,
      clientType,
      responsibleWorker: responsibleWorker || null,
      cooperationEndsAt: cooperationEndsAt ? new Date(cooperationEndsAt) : null,
      createdById: session.userId,
      createdByName: session.fullName,
    },
  });

  // Record creation in history
  await prisma.pzkHistory.create({
    data: {
      caseId: newCase.id,
      changedBy: session.fullName,
      field: "Sprawa",
      oldValue: null,
      newValue: "Utworzono",
    },
  });

  return NextResponse.json(newCase, { status: 201 });
}
