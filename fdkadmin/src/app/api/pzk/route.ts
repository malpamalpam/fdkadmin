import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { PzkClientType, PzkPanel } from "@/lib/pzk-types";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
    });

    return NextResponse.json(cases);
  } catch (err) {
    console.error("PZK GET error:", err);
    return NextResponse.json({ error: "Błąd ładowania spraw" }, { status: 500 });
  }
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

  // Auto-close legalization for Polish clients (Standard-Kadry, TUTLO-PL)
  const isPolishClient = clientType === "STANDARD_KADRY" || clientType === "TUTLO_PL";

  try {
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
        // Auto-close legalization module for non-foreigner clients
        ...(isPolishClient ? {
          mod5Legal: { legalNieDotyczy: true },
          mod5Closed: true,
          mod5AClosed: true,
          mod5BClosed: true,
        } : {}),
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
  } catch (err) {
    console.error("PZK POST error:", err);
    return NextResponse.json({ error: "Błąd tworzenia sprawy — sprawdź logi serwera" }, { status: 500 });
  }
}
