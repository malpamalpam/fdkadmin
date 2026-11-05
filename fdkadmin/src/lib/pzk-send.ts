// ─── Shared PZK send logic ──────────────────────────────────────────────────
// Used by both /api/pzk/[id]/send and /api/pzk/send-bulk

import { prisma } from "./prisma";
import {
  resolvePzkRecipients,
  emailPzkInitial,
  formatPzkDate,
  calcInitialDeadline,
  calcUrgentDeadline,
} from "./pzk-email";
import { PzkPanel } from "./pzk-types";

export interface SendPzkOpts {
  isUrgent: boolean;
  urgentLabel?: string | null;
}

export interface SendPzkResult {
  ok: true;
  recipientCount: number;
  deadline: Date;
}

/**
 * Send initial PZK notification for a single case.
 * Resolves recipients, sends email, updates DB flags and creates history entry.
 * Throws on email delivery failure.
 */
export async function sendPzkCase(
  caseId: string,
  senderName: string,
  opts: SendPzkOpts,
): Promise<SendPzkResult> {
  const c = await prisma.pzkCase.findUnique({ where: { id: caseId } });
  if (!c) throw new Error("NOT_FOUND");
  if (c.caseClosed) throw new Error("CASE_CLOSED");
  if (c.withdrawnFromNotice) throw new Error("WITHDRAWN");

  const { isUrgent, urgentLabel } = opts;

  const now = new Date();
  const deadline = isUrgent && urgentLabel
    ? calcUrgentDeadline(urgentLabel, now)
    : calcInitialDeadline(now);

  const recipients = await resolvePzkRecipients({
    panel: c.panel as PzkPanel,
    clientType: c.clientType as never,
    mod1Closed: c.mod1Closed,
    mod2Closed: c.mod2Closed,
    mod3Closed: c.mod3Closed,
    mod3BClosed: c.mod3BClosed,
    mod4Closed: c.mod4Closed,
    mod5Closed: c.mod5Closed,
    mod6Closed: c.mod6Closed,
    mod7AClosed: c.mod7AClosed,
    mod7BClosed: c.mod7BClosed,
    mod8AClosed: c.mod8AClosed,
    mod8BClosed: c.mod8BClosed,
  });

  const fullName = `${c.firstNames} ${c.lastName}`;
  const cooperationEndsAt = c.cooperationEndsAt ? formatPzkDate(c.cooperationEndsAt) : "—";

  await emailPzkInitial({
    caseId,
    panel: c.panel as PzkPanel,
    fullName,
    cooperationEndsAt,
    isUrgent,
    urgentLabel: urgentLabel ?? null,
    recipients,
  });

  await prisma.pzkCase.update({
    where: { id: caseId },
    data: {
      emailInitialSent: true,
      initialDeadline: deadline,
      isUrgent,
      urgentLabel: urgentLabel ?? null,
    },
  });

  await prisma.pzkHistory.create({
    data: {
      caseId,
      changedBy: senderName,
      field: "Powiadomienie wstępne",
      oldValue: null,
      newValue: isUrgent ? `PILNE (${urgentLabel})` : "Standardowe (2 dni robocze)",
    },
  });

  return { ok: true, recipientCount: recipients.length, deadline };
}
