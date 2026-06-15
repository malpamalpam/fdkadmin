import { Resend } from "resend";
import { prisma } from "./prisma";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const MAIL_FROM = process.env.MAIL_FROM || "rejestr@firmadlakazdego.pl";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fdkadmin.vercel.app";

export async function sendEmail(params: { to: string[]; subject: string; html: string }): Promise<boolean> {
  const r = getResend();
  if (!r) {
    console.log("[Email] Resend not configured, skipping:", params.subject);
    return false;
  }

  const recipients = params.to.filter(Boolean);
  if (recipients.length === 0) {
    console.log("[Email] No recipients, skipping:", params.subject);
    return false;
  }

  try {
    const { error } = await r.emails.send({
      from: MAIL_FROM,
      to: recipients,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[Email] Send error:", error);
      return false;
    }
    console.log("[Email] Sent:", params.subject, "→", recipients.join(", "));
    return true;
  } catch (err) {
    console.error("[Email] Failed:", err);
    return false;
  }
}

function caseLink(caseId: string): string {
  return `${APP_URL}/panel?caseId=${caseId}`;
}

function emailHtml(message: string, caseId: string): string {
  const link = caseLink(caseId);
  return `
<div style="font-family:sans-serif;max-width:600px;padding:16px">
  <p style="font-size:14px;line-height:1.6">${message}</p>
  <p style="margin-top:16px"><a href="${link}" style="background:#1d4ed8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Otwórz sprawę</a></p>
  <p style="margin-top:24px;font-size:11px;color:#999">FDK Rejestr zgłoszeń — Fundacja Firma Dla Każdego</p>
</div>`.trim();
}

// --- Resolve email recipients ---

export async function getOwnerEmail(ownerId: string | null): Promise<string | null> {
  if (!ownerId) return null;
  const user = await prisma.user.findUnique({ where: { id: ownerId } });
  return user?.email || null;
}

export async function getTakerEmail(takerId: string | null): Promise<string | null> {
  if (!takerId) return null;
  const user = await prisma.user.findUnique({ where: { id: takerId } });
  return user?.email || null;
}

export async function getDeptEmails(dept: string): Promise<string[]> {
  const cfg = await prisma.departmentConfig.findUnique({ where: { code: dept as never } });
  if (cfg?.emails?.length) return cfg.emails;
  if (cfg?.email) return [cfg.email];
  return [];
}

// If no owner, fallback to dept emails
export async function getOwnerOrDeptEmails(ownerId: string | null, dept: string): Promise<string[]> {
  const ownerEmail = await getOwnerEmail(ownerId);
  if (ownerEmail) return [ownerEmail];
  return getDeptEmails(dept);
}

// --- Email senders per event ---

export async function emailNewCase(opts: { client: string; topic: string; dept: string; deptLabel: string; ownerId: string | null; takerId: string | null; caseId: string }) {
  const deptEmails = await getDeptEmails(opts.dept);
  const ownerEmail = await getOwnerEmail(opts.ownerId);

  // Collect unique recipients (dept + owner, no duplicates, no taker=owner dupes)
  const allEmails = Array.from(new Set([...deptEmails, ...(ownerEmail ? [ownerEmail] : [])]));

  if (allEmails.length === 0) return;

  await sendEmail({
    to: allEmails,
    subject: `[FDK Rejestr] Nowe zgłoszenie: ${opts.client}`,
    html: emailHtml(
      `Nowa sprawa: <strong>${opts.client}</strong> — ${opts.topic} (${opts.deptLabel}).<br>Przyjmij zgłoszenie i wyznacz czas reakcji.`,
      opts.caseId
    ),
  });
}

export async function emailUnpicked(opts: { client: string; topic: string; dept: string; ownerId: string | null; minutes: number; type: "unpicked" | "noContact"; caseId: string }) {
  const ownerEmail = await getOwnerEmail(opts.ownerId);
  if (!ownerEmail) return;

  const action = opts.type === "unpicked" ? "przyjmij zgłoszenie" : "wyślij kontakt wstępny";
  const typeLabel = opts.type === "unpicked" ? "Sprawa nieprzyjęta" : "Kontakt wstępny niewysłany";

  await sendEmail({
    to: [ownerEmail],
    subject: `[FDK Rejestr] ${typeLabel}: ${opts.client}`,
    html: emailHtml(
      `Sprawa <strong>${opts.client}</strong> czeka od ${opts.minutes} min — ${action}.`,
      opts.caseId
    ),
  });
}

export async function email30min(opts: { client: string; topic: string; dept: string; ownerId: string | null; minutes: number; deadline: string; caseId: string }) {
  const ownerEmail = await getOwnerEmail(opts.ownerId);
  if (!ownerEmail) return;

  await sendEmail({
    to: [ownerEmail],
    subject: `[FDK Rejestr] Za ${opts.minutes} min mija deadline: ${opts.client}`,
    html: emailHtml(
      `Za <strong>${opts.minutes} min</strong> mija deadline: <strong>${opts.client}</strong> — ${opts.topic}.<br>Deadline: ${opts.deadline}.`,
      opts.caseId
    ),
  });
}

export async function emailOverdue(opts: { client: string; topic: string; dept: string; ownerId: string | null; deadline: string; caseId: string }) {
  const ownerEmail = await getOwnerEmail(opts.ownerId);
  if (!ownerEmail) return;

  await sendEmail({
    to: [ownerEmail],
    subject: `[FDK Rejestr] DEADLINE PRZEKROCZONY: ${opts.client}`,
    html: emailHtml(
      `<strong style="color:#dc2626">DEADLINE PRZEKROCZONY</strong>: <strong>${opts.client}</strong> — ${opts.topic}.<br>Skontaktuj się z beneficjentem natychmiast.`,
      opts.caseId
    ),
  });
}

export async function emailOwnerChanged(opts: { client: string; topic: string; newOwnerId: string | null; dept: string; caseId: string }) {
  const newOwnerEmail = await getOwnerEmail(opts.newOwnerId);
  if (!newOwnerEmail) return;

  await sendEmail({
    to: [newOwnerEmail],
    subject: `[FDK Rejestr] Przypisano sprawę: ${opts.client}`,
    html: emailHtml(
      `Przypisano Ci sprawę: <strong>${opts.client}</strong> — ${opts.topic}.<br>Przyjmij zgłoszenie, aby potwierdzić.`,
      opts.caseId
    ),
  });
}

export async function emailCaseClosed(opts: { client: string; topic: string; takerId: string | null; note: string; caseId: string }) {
  const takerEmail = await getTakerEmail(opts.takerId);
  if (!takerEmail) return;

  await sendEmail({
    to: [takerEmail],
    subject: `[FDK Rejestr] Sprawa zamknięta: ${opts.client}`,
    html: emailHtml(
      `Twoje zgłoszenie zamknięte: <strong>${opts.client}</strong> — ${opts.topic}.<br>Rozwiązanie: ${opts.note}`,
      opts.caseId
    ),
  });
}

// Legacy export for backward compat
export function buildCaseEmailHtml(opts: {
  title: string; client: string; topic: string; dept: string; owner: string;
  responseTime?: number | null; deadline?: string; caseId: string;
}): string {
  return emailHtml(
    `<strong>${opts.title}</strong><br>${opts.client} — ${opts.topic}<br>Dział: ${opts.dept}, Odpowiada: ${opts.owner}${opts.deadline ? `<br>Deadline: ${opts.deadline}` : ""}`,
    opts.caseId
  );
}
