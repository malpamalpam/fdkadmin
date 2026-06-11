import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const MAIL_FROM = process.env.MAIL_FROM || "rejestr@firmadlakazdego.pl";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fdkadmin.vercel.app";

interface EmailParams {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const r = getResend();
  if (!r) {
    console.log("[Email] Resend not configured, skipping:", params.subject);
    return false;
  }

  try {
    const { error } = await r.emails.send({
      from: MAIL_FROM,
      to: params.to.filter(Boolean),
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[Email] Send error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Failed:", err);
    return false;
  }
}

export function buildCaseEmailHtml(opts: {
  title: string;
  client: string;
  topic: string;
  dept: string;
  owner: string;
  responseTime?: number | null;
  deadline?: string;
  caseId: string;
}): string {
  const link = `${APP_URL}/panel?caseId=${opts.caseId}`;
  return `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#1d4ed8">${opts.title}</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:4px 8px;color:#666">Beneficjent:</td><td style="padding:4px 8px"><strong>${opts.client}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:#666">W sprawie:</td><td style="padding:4px 8px">${opts.topic}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">Dział:</td><td style="padding:4px 8px">${opts.dept}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">Odpowiada:</td><td style="padding:4px 8px">${opts.owner}</td></tr>
        ${opts.responseTime ? `<tr><td style="padding:4px 8px;color:#666">Czas reakcji:</td><td style="padding:4px 8px">${opts.responseTime}h</td></tr>` : ""}
        ${opts.deadline ? `<tr><td style="padding:4px 8px;color:#666">Deadline:</td><td style="padding:4px 8px">${opts.deadline}</td></tr>` : ""}
      </table>
      <p style="margin-top:16px"><a href="${link}" style="background:#1d4ed8;color:white;padding:8px 16px;border-radius:6px;text-decoration:none">Otwórz sprawę</a></p>
    </div>
  `.trim();
}
