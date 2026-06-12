import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canAccessCase, isAdminOrSupervisor } from "@/lib/auth";

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
  const { action } = body; // "firstContact" | "extend" | "accept" | "close"

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  // Permission: who marked it, owner, admin/supervisor
  const canUndo = isAdminOrSupervisor(session) ||
    caseRecord.ownerId === session.userId ||
    caseRecord.takerId === session.userId;

  if (!canUndo) {
    return NextResponse.json({ error: "Brak uprawnień do cofnięcia" }, { status: 403 });
  }

  let updateData: Record<string, unknown> = {};
  let historyField = "";
  let historyOld = "";
  let historyNew = "";

  switch (action) {
    case "firstContact":
      if (!caseRecord.firstContactSentAt) {
        return NextResponse.json({ error: "Kontakt wstępny nie był oznaczony" }, { status: 400 });
      }
      // If deadline was computed from firstContactSentAt, clear it
      const clearDeadline = caseRecord.responseTime && caseRecord.deadline;
      updateData = {
        firstContactSentAt: null,
        firstContactAt: null,
        status: caseRecord.previousStatus || "PRZYJETA",
        alert30Sent: false,
        alertOverSent: false,
        email30Sent: false,
        ...(clearDeadline ? { deadline: null, deadlineSetAt: null, deadlineSetBy: null } : {}),
      };
      historyField = "undo:firstContact";
      historyOld = "wysłany";
      historyNew = "cofnięto";
      break;

    case "extend":
      if (!caseRecord.extended) {
        return NextResponse.json({ error: "Sprawa nie była przedłużona" }, { status: 400 });
      }
      updateData = {
        extended: false,
        deadline: caseRecord.previousDeadline || caseRecord.deadline,
        previousDeadline: null,
        extensionSentAt: null,
        status: caseRecord.previousStatus || "KONTAKT_WSTEPNY",
        alert30Sent: false,
        alertOverSent: false,
        email30Sent: false,
      };
      historyField = "undo:extend";
      historyOld = "przedłużono";
      historyNew = "cofnięto";
      break;

    case "accept":
      if (caseRecord.status !== "PRZYJETA") {
        return NextResponse.json({ error: "Sprawa nie jest w statusie 'Przyjęta'" }, { status: 400 });
      }
      updateData = {
        acceptedAt: null,
        acceptedBy: null,
        responseTime: null,
        status: "ZGLOSZONA",
        alertNoDeadlineSent: false,
        alertNoContactSent: false,
      };
      historyField = "undo:accept";
      historyOld = "przyjęta";
      historyNew = "cofnięto do zgłoszonej";
      break;

    case "close":
      if (caseRecord.status !== "ZAMKNIETE") {
        return NextResponse.json({ error: "Sprawa nie jest zamknięta" }, { status: 400 });
      }
      // Reopen: restore previous status or KONTAKT_WSTEPNY
      const restoreStatus = caseRecord.previousStatus || (caseRecord.extended ? "PRZEDLUZONO" : (caseRecord.firstContactSentAt ? "KONTAKT_WSTEPNY" : "PRZYJETA"));
      updateData = {
        status: restoreStatus,
        closedAt: null,
        note: null,
        alert30Sent: false,
        alertOverSent: false,
        email30Sent: false,
      };
      historyField = "undo:close";
      historyOld = "zamknięta";
      historyNew = "otwarta ponownie";
      break;

    default:
      return NextResponse.json({ error: "Nieznana akcja cofania" }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.case.update({ where: { id }, data: updateData }),
    prisma.caseHistory.create({
      data: {
        caseId: id,
        changedBy: session.fullName,
        field: historyField,
        oldValue: historyOld,
        newValue: historyNew,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
