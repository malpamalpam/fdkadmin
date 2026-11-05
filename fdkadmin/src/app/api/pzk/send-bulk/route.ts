import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { sendPzkCase } from "@/lib/pzk-send";

// POST /api/pzk/send-bulk
// Body: { ids: string[], isUrgent: boolean, urgentLabel?: "1h"|"2h"|"3h"|"1 dzień" }

const MAX_IDS = 50;

export async function POST(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN, SUPERVISOR, or ADMINISTRACJA/TUTLO employees can send
  const allDepts = [session.dept, ...(session.extraDepts || [])].filter(Boolean);
  const canSend =
    session.role === "ADMIN" ||
    session.role === "SUPERVISOR" ||
    allDepts.includes("ADMINISTRACJA") ||
    allDepts.includes("TUTLO");
  if (!canSend) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const ids: string[] = body.ids;
  const isUrgent: boolean = body.isUrgent ?? false;
  const urgentLabel: string | null = body.urgentLabel ?? null;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids is required and must be a non-empty array" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Maksymalnie ${MAX_IDS} spraw na raz` }, { status: 400 });
  }

  // Pre-fetch all cases for names (for the response)
  const cases = await prisma.pzkCase.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstNames: true, lastName: true, caseClosed: true, withdrawnFromNotice: true },
  });
  const caseMap = new Map(cases.map((c) => [c.id, c]));

  const sent: { id: string; name: string; recipientCount: number }[] = [];
  const skipped: { id: string; name: string; reason: string }[] = [];
  const failed: { id: string; name: string; error: string }[] = [];

  // Process sequentially to respect email rate limits
  for (const id of ids) {
    const c = caseMap.get(id);
    if (!c) {
      skipped.push({ id, name: "—", reason: "Nie znaleziono sprawy" });
      continue;
    }
    const name = `${c.firstNames} ${c.lastName}`;
    if (c.caseClosed) {
      skipped.push({ id, name, reason: "Sprawa zamknięta" });
      continue;
    }
    if (c.withdrawnFromNotice) {
      skipped.push({ id, name, reason: "Rezygnacja z wypowiedzenia" });
      continue;
    }

    try {
      const result = await sendPzkCase(id, session.fullName, { isUrgent, urgentLabel });
      sent.push({ id, name, recipientCount: result.recipientCount });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      failed.push({ id, name, error: msg });
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
