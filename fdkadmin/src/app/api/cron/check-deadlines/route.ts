import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTeamsMessage, formatDeadline } from "@/lib/teams";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  // Find open cases
  const openCases = await prisma.case.findMany({
    where: {
      status: { not: "ZAMKNIETE" },
    },
  });

  let alertsSent = 0;

  for (const c of openCases) {
    // Alert: deadline within 30 minutes
    if (!c.alert30Sent && c.deadline <= in30min && c.deadline > now) {
      const minutesLeft = Math.ceil((c.deadline.getTime() - now.getTime()) / 60000);
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
