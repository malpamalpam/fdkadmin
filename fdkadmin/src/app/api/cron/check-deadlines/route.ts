import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTeamsMessage, sendTeamsAdaptiveCard, formatDeadline } from "@/lib/teams";
import { emailUnpicked, email30min, emailOverdue } from "@/lib/email";
import { DEPT_LABELS } from "@/lib/constants";

async function getOwnerMention(ownerId: string | null): Promise<{ name: string; upn: string }[]> {
  if (!ownerId) return [];
  const user = await prisma.user.findUnique({ where: { id: ownerId } });
  if (user?.teamsUpn) return [{ name: user.fullName, upn: user.teamsUpn }];
  return [];
}

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
    // Alert 1: ZGLOSZONA > 30 min — Teams kanał + email imienny ownera (lub dział)
    if (
      (c.status === "ZGLOSZONA" || c.status === "OCZEKUJE_NA_DEADLINE") &&
      !c.alertNoDeadlineSent
    ) {
      const minSince = Math.floor((now.getTime() - c.createdAt.getTime()) / 60000);
      if (minSince >= 30) {
        await sendTeamsMessage(
          "⚠ Sprawa nieprzyjęta",
          `**${c.client}** — ${c.topic}\n\nOd **${minSince} min** nikt nie przyjął zgłoszenia!\n\nDział: ${DEPT_LABELS[c.dept] || c.dept}\n\nOdpowiada: **${c.owner || "nieprzypisany"}**`
        );
        await emailUnpicked({ client: c.client, topic: c.topic, dept: c.dept, ownerId: c.ownerId, minutes: minSince, type: "unpicked", caseId: c.id });
        await prisma.case.update({ where: { id: c.id }, data: { alertNoDeadlineSent: true } });
        alertsSent++;
      }
    }

    // Alert 2: PRZYJETA but no first contact > 30 min — Teams kanał + email imienny ownera (lub dział)
    if (
      (c.status === "PRZYJETA" || c.status === "NOWE") &&
      c.acceptedAt && !c.firstContactSentAt && !c.alertNoContactSent
    ) {
      const minSince = Math.floor((now.getTime() - c.acceptedAt.getTime()) / 60000);
      if (minSince >= 30) {
        await sendTeamsMessage(
          "⚠ Kontakt wstępny niewysłany",
          `**${c.client}** — ${c.topic}\n\nSprawa przyjęta **${minSince} min** temu, ale kontakt wstępny wciąż niewysłany!\n\nOdpowiada: **${c.owner || "nieprzypisany"}**`
        );
        await emailUnpicked({ client: c.client, topic: c.topic, dept: c.dept, ownerId: c.ownerId, minutes: minSince, type: "noContact", caseId: c.id });
        await prisma.case.update({ where: { id: c.id }, data: { alertNoContactSent: true } });
        alertsSent++;
      }
    }

    if (!c.deadline) continue;

    // Alert 3: 30 min before deadline — @wzmianka Teams + email imienny ownera
    if (!c.alert30Sent && c.deadline <= in30min && c.deadline > now) {
      const minutesLeft = Math.ceil((c.deadline.getTime() - now.getTime()) / 60000);
      const mentions = await getOwnerMention(c.ownerId);
      await sendTeamsAdaptiveCard(
        `⏰ Za ${minutesLeft} min mija deadline`,
        `**${c.client}** (${c.topic})\n\nOdpowiada: **${c.owner || "nieprzypisany"}**\n\nDeadline: ${formatDeadline(c.deadline)}`,
        mentions
      );
      if (!c.email30Sent) {
        await email30min({ client: c.client, topic: c.topic, dept: c.dept, ownerId: c.ownerId, minutes: minutesLeft, deadline: formatDeadline(c.deadline), caseId: c.id });
      }
      await prisma.case.update({ where: { id: c.id }, data: { alert30Sent: true, email30Sent: true } });
      alertsSent++;
    }

    // Alert 4: deadline passed — @wzmianka Teams + email imienny ownera
    if (!c.alertOverSent && c.deadline <= now) {
      const mentions = await getOwnerMention(c.ownerId);
      await sendTeamsAdaptiveCard(
        "🔴 DEADLINE PRZEKROCZONY",
        `**${c.client}** (${c.topic})\n\nOdpowiada: **${c.owner || "nieprzypisany"}**\n\nDeadline: ${formatDeadline(c.deadline)}\n\nKonieczny natychmiastowy kontakt!`,
        mentions
      );
      await emailOverdue({ client: c.client, topic: c.topic, dept: c.dept, ownerId: c.ownerId, deadline: formatDeadline(c.deadline), caseId: c.id });
      await prisma.case.update({ where: { id: c.id }, data: { alertOverSent: true } });
      alertsSent++;
    }
  }

  return NextResponse.json({ checked: openCases.length, alertsSent, timestamp: now.toISOString() });
}
