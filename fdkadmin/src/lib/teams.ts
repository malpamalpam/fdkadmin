import { prisma } from "./prisma";

async function getWebhookUrl(): Promise<string | null> {
  const settings = await prisma.setting.findUnique({ where: { id: "default" } });
  return settings?.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL || null;
}

export async function sendTeamsMessage(title: string, text: string): Promise<boolean> {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    console.log("[Teams] No webhook URL configured, skipping notification");
    console.log(`[Teams] ${title}: ${text}`);
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: title.includes("PRZEKROCZONY") ? "FF0000" : title.includes("Za") ? "FFA500" : "0076D7",
        summary: title,
        sections: [
          {
            activityTitle: title,
            activitySubtitle: new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }),
            text: text,
            markdown: true,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[Teams] Webhook error: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Teams] Failed to send message:", error);
    return false;
  }
}

export function formatDeadline(date: Date): string {
  return date.toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}
