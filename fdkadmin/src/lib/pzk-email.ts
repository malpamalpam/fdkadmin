// ─── PZK email routing + notification senders ────────────────────────────────

import { sendEmail } from "./email";
import { prisma } from "./prisma";
import { PzkClientType, PzkPanel } from "./pzk-types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fdkadmin.vercel.app";

function pzkLink(caseId: string, panel: PzkPanel): string {
  const base = panel === "PZK" ? "/panel/pzk" : "/panel/pzk-tutlo";
  return `${APP_URL}${base}/${caseId}`;
}

function pzkHtml(message: string, caseId: string, panel: PzkPanel): string {
  const link = pzkLink(caseId, panel);
  return `
<div style="font-family:sans-serif;max-width:600px;padding:16px">
  <p style="font-size:14px;line-height:1.6">${message}</p>
  <p style="margin-top:16px"><a href="${link}" style="background:#1d4ed8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Otwórz sprawę</a></p>
  <p style="margin-top:24px;font-size:11px;color:#999">FDK – Panel Zamknięcia Klienta — Fundacja Firma Dla Każdego</p>
</div>`.trim();
}

// ─── Resolve dept emails by Department code ───────────────────────────────────

async function getDeptEmails(deptCode: string): Promise<string[]> {
  const cfg = await prisma.departmentConfig.findUnique({ where: { code: deptCode as never } });
  if (cfg?.emails?.length) return cfg.emails;
  if (cfg?.email) return [cfg.email];
  return [];
}

// ─── Routing table ────────────────────────────────────────────────────────────
//
// Returns list of { moduleLabel, emails } for a given case.
// Only modules that should receive a notification are returned.
//
// Panel PZK (non-Tutlo):
//   mod1+mod2 → administracja
//   mod3A     → KADRY (Standard-Kadry) | HR (Obcokrajowiec-HR/HR.ENG) — note: in DB dept codes
//   mod3B     → k.erbetowska email from KADRY dept or personal
//   mod4      → ksiegowosc
//   mod5      → legalizacja ONLY if Obcokrajowiec-HR or HR.ENG
//   mod6      → m.niewiarowska (OPLATY dept)
//   mod7      → b2b
//   mod8      → p.wrobel (ADMINISTRACJA dept or personal)
//
// Panel PZK Tutlo:
//   mod1+mod2 → p.wrobel (ADMINISTRACJA / TUTLO)
//   mod3A     → tutlo dept (TUTLO)
//   mod3B     → k.erbetowska
//   mod4      → ksiegowosc
//   mod5      → legalizacja ONLY if TUTLO_OBCOKRAJOWIEC
//   mod6      → payments dept (OPLATY)
//   mod7      → b2b
//   mod8      → p.wrobel (ADMINISTRACJA)

export interface ModuleRecipient {
  moduleLabel: string;
  moduleKey: string;
  emails: string[];
}

export async function resolvePzkRecipients(opts: {
  panel: PzkPanel;
  clientType: PzkClientType;
  mod3AClosed: boolean;
  mod3BClosed: boolean;
  mod4Closed: boolean;
  mod5Closed: boolean;
  mod6Closed: boolean;
  mod7AClosed: boolean;
  mod7BClosed: boolean;
  mod8Closed: boolean;
  mod1Closed: boolean;
  mod2Closed: boolean;
}): Promise<ModuleRecipient[]> {
  const { panel, clientType } = opts;

  const [adminEmails, kadryEmails, hrEmails, ksiegEmails, legalEmails, oplatyEmails, b2bEmails, tutloEmails] =
    await Promise.all([
      getDeptEmails("ADMINISTRACJA"),
      getDeptEmails("KADRY"),
      getDeptEmails("HR"),
      getDeptEmails("KSIEGOWOSC"),
      getDeptEmails("LEGALIZACJA"),
      getDeptEmails("OPLATY"),
      getDeptEmails("B2B"),
      getDeptEmails("TUTLO"),
    ]);

  const recipients: ModuleRecipient[] = [];

  // Module 1+2: Beneficjent + Administration
  if (!opts.mod1Closed || !opts.mod2Closed) {
    const emails = panel === "PZK" ? adminEmails : tutloEmails.length ? tutloEmails : adminEmails;
    if (emails.length) {
      recipients.push({ moduleKey: "mod1", moduleLabel: "Beneficjent + Administracja", emails });
    }
  }

  // Module 3A: Kadry – sprawy kadrowe
  if (!opts.mod3AClosed) {
    let emails: string[] = [];
    if (panel === "PZK") {
      if (clientType === "STANDARD_KADRY") emails = kadryEmails;
      else if (clientType === "OBCOKRAJOWIEC_HR" || clientType === "OBCOKRAJOWIEC_HR_ENG") emails = hrEmails;
      // Tutlo types don't go to PZK panel mod3A in non-Tutlo routing
    } else {
      // PZK_TUTLO: mod3A → tutlo
      emails = tutloEmails;
    }
    if (emails.length) {
      recipients.push({ moduleKey: "mod3A", moduleLabel: "Kadry – sprawy kadrowe", emails });
    }
  }

  // Module 3B: Kadry – ubezpieczenia → always k.erbetowska (KADRY dept)
  if (!opts.mod3BClosed) {
    if (kadryEmails.length) {
      recipients.push({ moduleKey: "mod3B", moduleLabel: "Kadry – ubezpieczenia", emails: kadryEmails });
    }
  }

  // Module 4: Księgowość – always
  if (!opts.mod4Closed) {
    if (ksiegEmails.length) {
      recipients.push({ moduleKey: "mod4", moduleLabel: "Księgowość", emails: ksiegEmails });
    }
  }

  // Module 5: Legalizacja – only for foreigners
  if (!opts.mod5Closed) {
    const isForeigner =
      panel === "PZK"
        ? clientType === "OBCOKRAJOWIEC_HR" || clientType === "OBCOKRAJOWIEC_HR_ENG"
        : clientType === "TUTLO_OBCOKRAJOWIEC";
    if (isForeigner && legalEmails.length) {
      recipients.push({ moduleKey: "mod5", moduleLabel: "Legalizacja", emails: legalEmails });
    }
  }

  // Module 6: Płatności
  if (!opts.mod6Closed) {
    if (oplatyEmails.length) {
      recipients.push({ moduleKey: "mod6", moduleLabel: "Płatności", emails: oplatyEmails });
    }
  }

  // Module 7: Umowy B2B + Najem
  if (!opts.mod7AClosed || !opts.mod7BClosed) {
    if (b2bEmails.length) {
      recipients.push({ moduleKey: "mod7", moduleLabel: "Umowy kontrahenckie", emails: b2bEmails });
    }
  }

  // Module 8: Inne → administracja (or tutlo for PZK Tutlo)
  if (!opts.mod8Closed) {
    const emails = panel === "PZK" ? adminEmails : tutloEmails.length ? tutloEmails : adminEmails;
    if (emails.length) {
      recipients.push({ moduleKey: "mod8", moduleLabel: "Inne", emails });
    }
  }

  return recipients;
}

// ─── Collect ALL unique emails from routing ───────────────────────────────────

export function allUniqueEmails(recipients: ModuleRecipient[]): string[] {
  return Array.from(new Set(recipients.flatMap((r) => r.emails)));
}

// ─── Type A: Initial notification ────────────────────────────────────────────

export async function emailPzkInitial(opts: {
  caseId: string;
  panel: PzkPanel;
  fullName: string; // "Imiona Nazwisko"
  cooperationEndsAt: string; // formatted date
  isUrgent: boolean;
  urgentLabel?: string | null;
  recipients: ModuleRecipient[];
}) {
  const { caseId, panel, fullName, cooperationEndsAt, isUrgent, urgentLabel, recipients } = opts;
  const subject = isUrgent
    ? `Nowe wypowiedzenie – PILNE – ${fullName}`
    : `Nowe wypowiedzenie – ${fullName}`;
  const deadline = isUrgent && urgentLabel ? urgentLabel : "2 dni";
  const body = `Otrzymaliśmy wypowiedzenie Beneficjenta <strong>${fullName}</strong>, nasza współpraca zakończy się <strong>${cooperationEndsAt}</strong>. Proszę o wstępne sprawdzenie stanu spraw i uzupełnienie raportu w ciągu ${deadline}.`;

  const allEmails = allUniqueEmails(recipients);
  if (!allEmails.length) return;

  await sendEmail({ to: allEmails, subject, html: pzkHtml(body, caseId, panel) });
}

// ─── Type C: Automatic 15th-of-month ─────────────────────────────────────────

export async function emailPzkMid(opts: {
  caseId: string;
  panel: PzkPanel;
  fullName: string;
  cooperationEndsAt: string;
  recipients: ModuleRecipient[];
}) {
  const { caseId, panel, fullName, cooperationEndsAt, recipients } = opts;
  const subject = `Zamknięcie klienta – ${fullName}`;
  const body = `Proszę o uzupełnienie spraw Beneficjenta <strong>${fullName}</strong>, nasza współpraca zakończy się <strong>${cooperationEndsAt}</strong> – do 20 dnia miesiąca.`;

  const allEmails = allUniqueEmails(recipients);
  if (!allEmails.length) return;

  await sendEmail({ to: allEmails, subject, html: pzkHtml(body, caseId, panel) });
}

// ─── Type D: Automatic 28th-of-month ─────────────────────────────────────────

export async function emailPzkFinal(opts: {
  caseId: string;
  panel: PzkPanel;
  fullName: string;
  cooperationEndsAt: string;
  recipients: ModuleRecipient[];
}) {
  const { caseId, panel, fullName, cooperationEndsAt, recipients } = opts;
  const subject = `Ostateczne zamknięcie klienta – ${fullName}`;
  const body = `Proszę o uzupełnienie spraw Beneficjenta <strong>${fullName}</strong>, nasza współpraca zakończy się <strong>${cooperationEndsAt}</strong> w ciągu 1 dnia.`;

  const allEmails = allUniqueEmails(recipients);
  if (!allEmails.length) return;

  await sendEmail({ to: allEmails, subject, html: pzkHtml(body, caseId, panel) });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatPzkDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Calculate initial deadline: 2 business days from now (or from next day if after 16:00) */
export function calcInitialDeadline(from: Date = new Date()): Date {
  const warsawOffset = 60; // UTC+1/UTC+2 — we use simple heuristic
  const local = new Date(from.getTime() + warsawOffset * 60 * 1000);
  let start = new Date(local);
  // If after 16:00 local, start counting from next day
  if (local.getUTCHours() >= 16) {
    start.setUTCDate(start.getUTCDate() + 1);
  }
  start.setUTCHours(9, 0, 0, 0); // normalize to 9:00

  let businessDays = 0;
  const deadline = new Date(start);
  while (businessDays < 2) {
    deadline.setUTCDate(deadline.getUTCDate() + 1);
    const day = deadline.getUTCDay();
    if (day !== 0 && day !== 6) businessDays++; // skip weekends
  }
  return deadline;
}

/** Parse urgent label to deadline Date */
export function calcUrgentDeadline(label: string, from: Date = new Date()): Date {
  const d = new Date(from);
  if (label === "1h") d.setHours(d.getHours() + 1);
  else if (label === "2h") d.setHours(d.getHours() + 2);
  else if (label === "3h") d.setHours(d.getHours() + 3);
  else if (label === "1 dzień") d.setDate(d.getDate() + 1);
  return d;
}
