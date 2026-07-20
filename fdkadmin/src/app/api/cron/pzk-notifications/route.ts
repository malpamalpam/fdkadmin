import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resolvePzkRecipients,
  emailPzkMid,
  emailPzkFinal,
  formatPzkDate,
} from "@/lib/pzk-email";
import { PzkPanel, PzkClientType } from "@/lib/pzk-types";

// GET /api/cron/pzk-notifications
// Runs on 15th and 28th of each month (see vercel.json).
// Sends type-C (15th) or type-D (28th) emails for cases whose
// cooperationEndsAt falls in the current month and are not fully closed
// and not withdrawn from notice.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day = now.getDate();
  const isDay15 = day === 15;
  const isDay28 = day >= 28;

  if (!isDay15 && !isDay28) {
    return NextResponse.json({ skipped: true, reason: `Not 15th or 28th (day=${day})` });
  }

  // Scope: cases ending in current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const cases = await prisma.pzkCase.findMany({
    where: {
      withdrawnFromNotice: false,
      caseClosed: false,
      cooperationEndsAt: { gte: monthStart, lt: monthEnd },
      ...(isDay15 ? { emailMid15Sent: false } : { emailFinal28Sent: false }),
    },
  });

  let sent = 0;

  for (const c of cases) {
    // Skip if ALL modules are closed
    const allClosed =
      c.mod1Closed && c.mod2Closed && c.mod3AClosed && c.mod3BClosed &&
      c.mod4Closed && c.mod5Closed && c.mod6Closed && c.mod7AClosed &&
      c.mod7BClosed && c.mod8Closed;
    if (allClosed) continue;

    const recipients = await resolvePzkRecipients({
      panel: c.panel as PzkPanel,
      clientType: c.clientType as PzkClientType,
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

    if (!recipients.length) continue;

    const fullName = `${c.firstNames} ${c.lastName}`;
    const cooperationEndsAt = c.cooperationEndsAt ? formatPzkDate(c.cooperationEndsAt) : "—";

    if (isDay15 && !c.emailMid15Sent) {
      await emailPzkMid({ caseId: c.id, panel: c.panel as PzkPanel, fullName, cooperationEndsAt, recipients });
      await prisma.pzkCase.update({ where: { id: c.id }, data: { emailMid15Sent: true } });
      await prisma.pzkHistory.create({
        data: {
          caseId: c.id,
          changedBy: "System (cron)",
          field: "Powiadomienie 15.",
          oldValue: null,
          newValue: "Wysłano",
        },
      });
      sent++;
    } else if (isDay28 && !c.emailFinal28Sent) {
      await emailPzkFinal({ caseId: c.id, panel: c.panel as PzkPanel, fullName, cooperationEndsAt, recipients });
      await prisma.pzkCase.update({ where: { id: c.id }, data: { emailFinal28Sent: true } });
      await prisma.pzkHistory.create({
        data: {
          caseId: c.id,
          changedBy: "System (cron)",
          field: "Powiadomienie 28.",
          oldValue: null,
          newValue: "Wysłano",
        },
      });
      sent++;
    }
  }

  return NextResponse.json({
    checked: cases.length,
    sent,
    type: isDay15 ? "mid-month (15th)" : "final (28th)",
    timestamp: now.toISOString(),
  });
}
