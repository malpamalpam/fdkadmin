import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = await prisma.pzkCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(c);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.pzkCase.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  // Allow updating top-level beneficjent fields + close flags
  const allowed = [
    "lastName", "firstNames", "benefEmail", "clientType", "responsibleWorker",
    "cooperationEndsAt", "withdrawnFromNotice", "caseClosed",
    "internalComment", "contactLog",
    "mod1Closed", "mod2Closed", "mod2AClosed", "mod2BClosed", "mod2CClosed",
    "mod3Closed", "mod3AClosed", "mod3PayClosed", "mod3LegitClosed",
    "mod3BClosed", "mod4UbezpAClosed", "mod4UbezpBClosed",
    "mod4Closed", "mod4AClosed", "mod4BClosed",
    "mod5Closed", "mod5AClosed", "mod5BClosed",
    "mod6Closed", "mod6AClosed", "mod6BClosed", "mod6CClosed",
    "mod7AClosed", "mod7BClosed",
    "mod8Closed", "mod8AClosed", "mod8BClosed",
  ];

  const updates: Record<string, unknown> = {};
  const historyEntries: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  for (const key of allowed) {
    if (key in body) {
      const oldVal = (existing as Record<string, unknown>)[key];
      const newVal = body[key];
      if (String(oldVal) !== String(newVal)) {
        updates[key] = key === "cooperationEndsAt" && newVal ? new Date(newVal) : newVal;
        historyEntries.push({
          field: key,
          oldValue: oldVal !== null && oldVal !== undefined ? String(oldVal) : null,
          newValue: newVal !== null && newVal !== undefined ? String(newVal) : null,
        });
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  // Auto-manage legalization module when clientType changes
  if (updates.clientType) {
    const polishTypes = ["STANDARD_KADRY", "TUTLO_PL"];
    const wasPolish = polishTypes.includes(existing.clientType);
    const isNowPolish = polishTypes.includes(updates.clientType as string);
    if (!wasPolish && isNowPolish) {
      // Switched to Polish → auto-close legalization as ND
      updates.mod5Closed = true;
      updates.mod5AClosed = true;
      updates.mod5BClosed = true;
      updates.mod5Legal = { legalNieDotyczy: true };
      historyEntries.push({ field: "mod5Closed", oldValue: "false", newValue: "true (auto: klient PL)" });
    } else if (wasPolish && !isNowPolish) {
      // Switched to foreigner → reopen legalization
      updates.mod5Closed = false;
      updates.mod5AClosed = false;
      updates.mod5BClosed = false;
      updates.mod5Legal = {};
      historyEntries.push({ field: "mod5Closed", oldValue: "true", newValue: "false (auto: klient obcokrajowiec)" });
    }
  }

  const updated = await prisma.pzkCase.update({ where: { id }, data: updates });

  if (historyEntries.length) {
    await prisma.pzkHistory.createMany({
      data: historyEntries.map((e) => ({
        caseId: id,
        changedBy: session.fullName,
        ...e,
      })),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.pzkCase.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pzkCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
