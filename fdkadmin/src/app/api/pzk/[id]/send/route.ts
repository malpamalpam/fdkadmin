import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import {
  resolvePzkRecipients,
  emailPzkInitial,
  formatPzkDate,
  calcInitialDeadline,
  calcUrgentDeadline,
} from "@/lib/pzk-email";
import { PzkPanel } from "@/lib/pzk-types";

// POST /api/pzk/[id]/send
// Body: { isUrgent: boolean, urgentLabel?: "1h"|"2h"|"3h"|"1 dzień", customDeadline?: string }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = await prisma.pzkCase.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only ADMIN, SUPERVISOR, or ADMINISTRACJA/TUTLO employees can send
  const canSend =
    session.role === "ADMIN" ||
    session.role === "SUPERVISOR" ||
    session.dept === "ADMINISTRACJA" ||
    session.dept === "TUTLO";
  if (!canSend) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const isUrgent: boolean = body.isUrgent ?? false;
  const urgentLabel: string | null = body.urgentLabel ?? null;

  const now = new Date();
  const deadline = isUrgent && urgentLabel
    ? calcUrgentDeadline(urgentLabel, now)
    : calcInitialDeadline(now);

  const recipients = await resolvePzkRecipients({
    panel: c.panel as PzkPanel,
    clientType: c.clientType as never,
    mod1Closed: c.mod1Closed,
    mod2Closed: c.mod2Closed,
    mod3AClosed: c.mod3AClosed,
    mod3BClosed: c.mod3BClosed,
    mod4Closed: c.mod4Closed,
    mod5Closed: c.mod5Closed,
    mod6Closed: c.mod6Closed,
    mod7AClosed: c.mod7AClosed,
    mod7BClosed: c.mod7BClosed,
    mod8Closed: c.mod8Closed,
  });

  const fullName = `${c.firstNames} ${c.lastName}`;
  const cooperationEndsAt = c.cooperationEndsAt ? formatPzkDate(c.cooperationEndsAt) : "—";

  await emailPzkInitial({
    caseId: id,
    panel: c.panel as PzkPanel,
    fullName,
    cooperationEndsAt,
    isUrgent,
    urgentLabel,
    recipients,
  });

  await prisma.pzkCase.update({
    where: { id },
    data: {
      emailInitialSent: true,
      initialDeadline: deadline,
      isUrgent,
      urgentLabel: urgentLabel ?? null,
    },
  });

  await prisma.pzkHistory.create({
    data: {
      caseId: id,
      changedBy: session.fullName,
      field: "Powiadomienie wstępne",
      oldValue: null,
      newValue: isUrgent ? `PILNE (${urgentLabel})` : "Standardowe (2 dni robocze)",
    },
  });

  return NextResponse.json({ ok: true, recipientCount: recipients.length, deadline });
}
