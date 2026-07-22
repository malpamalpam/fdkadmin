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

// ─── Routing table (new numbering: modules 1–9) ─────────────────────────────
//
// PZK (non-Tutlo):
//   mod1+mod2 (1+2)  → administracja
//   mod3 (3)         → KADRY | HR | HR_ENG (by clientType)
//   mod4 (4)         → k.erbetowska (KADRY dept)
//   mod5 (5)         → ksiegowosc
//   mod6 (6)         → legalizacja (only foreigners)
//   mod7 (7)         → m.niewiarowska (OPLATY dept)
//   mod8A (8A)       → m.niewiarowska (OPLATY dept)
//   mod8B (8B)       → m.niewiarowska (OPLATY dept)
//   mod9 (9)         → p.wrobel (ADMINISTRACJA dept)
//
// PZK Tutlo:
//   mod1+mod2 (1+2)  → p.wrobel (ADMINISTRACJA)
//   mod3 (3)         → tutlo
//   mod4 (4)         → k.erbetowska (KADRY)
//   mod5 (5)         → ksiegowosc
//   mod6 (6)         → legalizacja (only TUTLO_OBCOKRAJOWIEC)
//   mod7 (7)         → payments (OPLATY dept)
//   mod8A (8A)       → m.niewiarowska (OPLATY)
//   mod8B (8B)       → m.niewiarowska (OPLATY)
//   mod9 (9)         → p.wrobel (ADMINISTRACJA)

export interface ModuleRecipient {
  moduleLabel: string;
  moduleKey: string;
  emails: string[];
}

export async function resolvePzkRecipients(opts: {
  panel: PzkPanel;
  clientType: PzkClientType;
  mod1Closed: boolean;
  mod2Closed: boolean;
  mod3Closed: boolean;
  mod3BClosed: boolean;  // ubezpieczenia parent
  mod4Closed: boolean;   // księgowość parent (DB name)
  mod5Closed: boolean;   // legalizacja parent (DB name)
  mod6Closed: boolean;   // płatności parent (DB name)
  mod7AClosed: boolean;  // umowy B2B
  mod7BClosed: boolean;  // umowy najem
  mod8Closed: boolean;   // inne parent (DB name)
}): Promise<ModuleRecipient[]> {
  const { panel, clientType } = opts;

  const [adminEmails, kadryEmails, hrEmails, hrEngEmails, ksiegEmails, legalEmails, oplatyEmails, tutloEmails] =
    await Promise.all([
      getDeptEmails("ADMINISTRACJA"),
      getDeptEmails("KADRY"),
      getDeptEmails("HR"),
      getDeptEmails("HR_ENG"),
      getDeptEmails("KSIEGOWOSC"),
      getDeptEmails("LEGALIZACJA"),
      getDeptEmails("OPLATY"),
      getDeptEmails("TUTLO"),
    ]);

  const recipients: ModuleRecipient[] = [];

  // Module 1+2: Beneficjent + Administration
  if (!opts.mod1Closed || !opts.mod2Closed) {
    const emails = panel === "PZK" ? adminEmails : adminEmails; // p.wrobel is in ADMINISTRACJA
    if (emails.length) {
      recipients.push({ moduleKey: "mod1", moduleLabel: "Beneficjent + Administracja", emails });
    }
  }

  // Module 3: Kadry – sprawy kadrowe
  if (!opts.mod3Closed) {
    let emails: string[] = [];
    if (panel === "PZK") {
      if (clientType === "STANDARD_KADRY") emails = kadryEmails;
      else if (clientType === "OBCOKRAJOWIEC_HR") emails = hrEmails;
      else if (clientType === "OBCOKRAJOWIEC_HR_ENG") emails = hrEngEmails.length ? hrEngEmails : hrEmails;
    } else {
      // PZK_TUTLO: mod3 → tutlo
      emails = tutloEmails;
    }
    if (emails.length) {
      recipients.push({ moduleKey: "mod3", moduleLabel: "Kadry – sprawy kadrowe", emails });
    }
  }

  // Module 4: Kadry – ubezpieczenia → k.erbetowska (KADRY dept)
  if (!opts.mod3BClosed) {
    if (kadryEmails.length) {
      recipients.push({ moduleKey: "mod4", moduleLabel: "Kadry – ubezpieczenia", emails: kadryEmails });
    }
  }

  // Module 5: Księgowość
  if (!opts.mod4Closed) {
    if (ksiegEmails.length) {
      recipients.push({ moduleKey: "mod5", moduleLabel: "Księgowość", emails: ksiegEmails });
    }
  }

  // Module 6: Legalizacja – only for foreigners
  if (!opts.mod5Closed) {
    const isForeigner =
      panel === "PZK"
        ? clientType === "OBCOKRAJOWIEC_HR" || clientType === "OBCOKRAJOWIEC_HR_ENG"
        : clientType === "TUTLO_OBCOKRAJOWIEC";
    if (isForeigner && legalEmails.length) {
      recipients.push({ moduleKey: "mod6", moduleLabel: "Legalizacja", emails: legalEmails });
    }
  }

  // Module 7: Płatności → m.niewiarowska (OPLATY)
  if (!opts.mod6Closed) {
    if (oplatyEmails.length) {
      recipients.push({ moduleKey: "mod7", moduleLabel: "Płatności", emails: oplatyEmails });
    }
  }

  // Module 8A: Umowy B2B → m.niewiarowska (OPLATY)
  if (!opts.mod7AClosed) {
    if (oplatyEmails.length) {
      recipients.push({ moduleKey: "mod8A", moduleLabel: "Umowy B2B", emails: oplatyEmails });
    }
  }

  // Module 8B: Umowy najmu → m.niewiarowska (OPLATY)
  if (!opts.mod7BClosed) {
    if (oplatyEmails.length) {
      recipients.push({ moduleKey: "mod8B", moduleLabel: "Umowy najmu", emails: oplatyEmails });
    }
  }

  // Module 9: Inne → p.wrobel (ADMINISTRACJA)
  if (!opts.mod8Closed) {
    if (adminEmails.length) {
      recipients.push({ moduleKey: "mod9", moduleLabel: "Inne", emails: adminEmails });
    }
  }

  return recipients;
}

// ─── Collect ALL unique emails from routing ───────────────────────────────────

export function allUniqueEmails(recipients: ModuleRecipient[]): string[] {
  return Array.from(new Set(recipients.flatMap((r) => r.emails)));
}

// ─── Subject prefix for Tutlo ───────────────────────────────────────────────

function tutloPrefix(panel: PzkPanel): string {
  return panel === "PZK_TUTLO" ? " TUTLO" : "";
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
  const tp = tutloPrefix(panel);
  const subject = isUrgent
    ? `Nowe wypowiedzenie${tp} – PILNE – ${fullName}`
    : `Nowe wypowiedzenie${tp} – ${fullName}`;
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
  const tp = tutloPrefix(panel);
  const subject = `Zamknięcie klienta${tp} – ${fullName}`;
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
  const tp = tutloPrefix(panel);
  const subject = `Ostateczne zamknięcie klienta${tp} – ${fullName}`;
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
