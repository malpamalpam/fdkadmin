import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTeamsAdaptiveCard, formatDeadline } from "@/lib/teams";
import { sendEmail, buildCaseEmailHtml } from "@/lib/email";
import { DEPT_LABELS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  const openCases = await prisma.case.findMany({
    where: { status: { not: "ZAMKNIETE" } },
  });

  let alertsSent = 0;

  for (const c of openCases) {
    // Alert 1: ZGLOSZONA (unreported) > 30 min without acceptance
    if (
      (c.status === "ZGLOSZONA" || c.status === "OCZEKUJE_NA_DEADLINE") &&
      !c.alertNoDeadlineSent
    ) {
      const minutesSinceCreation = Math.floor(
        (now.getTime() - c.createdAt.getTime()) / 60000
      );
      if (minutesSinceCreation >= 30) {
        const mentions: { name: string; upn: string }[] = [];
        if (c.ownerId) {
          const ownerUser = await prisma.user.findUnique({ where: { id: c.ownerId } });
          if (ownerUser?.teamsUpn) mentions.push({ name: ownerUser.fullName, upn: ownerUser.teamsUpn });
        }
        await sendTeamsAdaptiveCard(
          "⚠ Sprawa nieprzyjęta",
          `**${c.client}** — ${c.topic}\n\nOd **${minutesSinceCreation} min** nikt nie przyjął zgłoszenia!\n\nDział: ${DEPT_LABELS[c.dept] || c.dept}\n\nOdpowiada: **${c.owner || "nieprzypisany"}**`,
          mentions
        );
        await prisma.case.update({
          where: { id: c.id },
          data: { alertNoDeadlineSent: true },
        });
        alertsSent++;
      }
    }

    // Alert 2: PRZYJETA but first contact not sent > 30 min
    if (
      (c.status === "PRZYJETA" || c.status === "NOWE") &&
      c.acceptedAt &&
      !c.firstContactSentAt &&
      !c.alertNoContactSent
    ) {
      const minutesSinceAccepted = Math.floor(
        (now.getTime() - c.acceptedAt.getTime()) / 60000
      );
      if (minutesSinceAccepted >= 30) {
        const mentions: { name: string; upn: string }[] = [];
        if (c.ownerId) {
          const ownerUser = await prisma.user.findUnique({ where: { id: c.ownerId } });
          if (ownerUser?.teamsUpn) mentions.push({ name: ownerUser.fullName, upn: ownerUser.teamsUpn });
        }
        await sendTeamsAdaptiveCard(
          "⚠ Kontakt wstępny niewysłany",
          `**${c.client}** — ${c.topic}\n\nSprawa przyjęta **${minutesSinceAccepted} min** temu, ale kontakt wstępny wciąż niewysłany!\n\nOdpowiada: **${c.owner || "nieprzypisany"}**`,
          mentions
        );
        await prisma.case.update({
          where: { id: c.id },
          data: { alertNoContactSent: true },
        });
        alertsSent++;
      }
    }

    // Only check deadline alerts for cases that have a deadline
    if (!c.deadline) continue;

    // Alert 3: 30 min before deadline (Teams + email)
    if (!c.alert30Sent && c.deadline <= in30min && c.deadline > now) {
      const minutesLeft = Math.ceil(
        (c.deadline.getTime() - now.getTime()) / 60000
      );
      const mentions: { name: string; upn: string }[] = [];
      if (c.ownerId) {
        const ownerUser = await prisma.user.findUnique({ where: { id: c.ownerId } });
        if (ownerUser?.teamsUpn) mentions.push({ name: ownerUser.fullName, upn: ownerUser.teamsUpn });
      }
      await sendTeamsAdaptiveCard(
        `⏰ Za ${minutesLeft} min mija deadline`,
        `**${c.client}** (${c.topic})\n\nOdpowiada: **${c.owner || "nieprzypisany"}**\n\nDeadline: ${formatDeadline(c.deadline)}`,
        mentions
      );

      // Email to owner
      if (!c.email30Sent && c.ownerId) {
        const ownerUser = await prisma.user.findUnique({ where: { id: c.ownerId } });
        if (ownerUser?.email) {
          await sendEmail({
            to: [ownerUser.email],
            subject: `⏰ Za ${minutesLeft} min mija deadline: ${c.client}`,
            html: buildCaseEmailHtml({
              title: `Za ${minutesLeft} min mija deadline`,
              client: c.client,
              topic: c.topic,
              dept: DEPT_LABELS[c.dept] || c.dept,
              owner: c.owner || "nieprzypisany",
              deadline: formatDeadline(c.deadline),
              caseId: c.id,
            }),
          });
        }
      }

      await prisma.case.update({
        where: { id: c.id },
        data: { alert30Sent: true, email30Sent: true },
      });
      alertsSent++;
    }

    // Alert 4: deadline passed
    if (!c.alertOverSent && c.deadline <= now) {
      const mentions: { name: string; upn: string }[] = [];
      if (c.ownerId) {
        const ownerUser = await prisma.user.findUnique({ where: { id: c.ownerId } });
        if (ownerUser?.teamsUpn) mentions.push({ name: ownerUser.fullName, upn: ownerUser.teamsUpn });
      }
      await sendTeamsAdaptiveCard(
        "🔴 DEADLINE PRZEKROCZONY",
        `**${c.client}** (${c.topic})\n\nOdpowiada: **${c.owner || "nieprzypisany"}**\n\nDeadline: ${formatDeadline(c.deadline)}\n\nKonieczny natychmiastowy kontakt!`,
        mentions
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
