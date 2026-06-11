import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTeamsMessage, formatDeadline } from "@/lib/teams";

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

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  const openCases = await prisma.case.findMany({
    where: {
      status: { not: "ZAMKNIETE" },
    },
  });

  let alertsSent = 0;

  for (const c of openCases) {
    // Alert: case waiting for deadline > 30 min
    if (
      c.status === "OCZEKUJE_NA_DEADLINE" &&
      !c.alertNoDeadlineSent
    ) {
      const minutesSinceCreation = Math.floor(
        (now.getTime() - c.createdAt.getTime()) / 60000
      );
      if (minutesSinceCreation >= 30) {
        await sendTeamsMessage(
          "⚠ Brak deadline'u",
          `**${c.client}** — ${c.topic}\n\nOd **${minutesSinceCreation} min** nikt nie wyznaczył deadline'u!\n\nDział: ${DEPT_LABELS[c.dept] || c.dept}\n\nOdpowiada: **${c.owner || "nieprzypisany"}**`
        );
        await prisma.case.update({
          where: { id: c.id },
          data: { alertNoDeadlineSent: true },
        });
        alertsSent++;
      }
    }

    // Only check deadline alerts for cases that have a deadline
    if (!c.deadline) continue;

    // Alert: deadline within 30 minutes
    if (!c.alert30Sent && c.deadline <= in30min && c.deadline > now) {
      const minutesLeft = Math.ceil(
        (c.deadline.getTime() - now.getTime()) / 60000
      );
      await sendTeamsMessage(
        `⏰ Za ${minutesLeft} min mija deadline`,
        `**${c.client}** (${c.topic})\n\nOdpowiada: **${c.owner || "nieprzypisany"}**\n\nDeadline: ${formatDeadline(c.deadline)}`
      );
      await prisma.case.update({
        where: { id: c.id },
        data: { alert30Sent: true },
      });
      alertsSent++;
    }

    // Alert: deadline passed
    if (!c.alertOverSent && c.deadline <= now) {
      await sendTeamsMessage(
        "🔴 DEADLINE PRZEKROCZONY",
        `**${c.client}** (${c.topic})\n\nOdpowiada: **${c.owner || "nieprzypisany"}**\n\nDeadline: ${formatDeadline(c.deadline)}\n\nKonieczny natychmiastowy kontakt!`
      );
      await prisma.case.update({
        where: { id: c.id },
        data: { alertOverSent: true },
      });
      alertsSent++;
    }
  }

  return NextResponse.json({
    checked: openCases.length,
    alertsSent,
    timestamp: now.toISOString(),
  });
}
