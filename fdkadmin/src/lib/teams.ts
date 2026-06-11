import { prisma } from "./prisma";

async function getWebhookUrls(): Promise<{ classic: string | null; workflows: string | null }> {
  const settings = await prisma.setting.findUnique({ where: { id: "default" } });
  return {
    classic: settings?.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL || null,
    workflows: settings?.workflowsWebhookUrl || process.env.WORKFLOWS_WEBHOOK_URL || null,
  };
}

// Classic MessageCard (fallback)
export async function sendTeamsMessage(title: string, text: string): Promise<boolean> {
  const { classic, workflows } = await getWebhookUrls();
  const webhookUrl = classic;
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
        themeColor: title.includes("PRZEKROCZONY") ? "FF0000" : title.includes("Za") || title.includes("⚠") ? "FFA500" : "0076D7",
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

// Adaptive Card with @mention via Power Automate Workflows webhook
export async function sendTeamsAdaptiveCard(
  title: string,
  text: string,
  mentions?: { name: string; upn: string }[]
): Promise<boolean> {
  const { workflows, classic } = await getWebhookUrls();

  // If Workflows webhook is configured, send Adaptive Card with mentions
  if (workflows && mentions && mentions.length > 0) {
    try {
      const mentionEntities = mentions.map((m, i) => ({
        type: "mention",
        text: `<at>${m.name}</at>`,
        mentioned: {
          id: m.upn,
          name: m.name,
        },
      }));

      // Replace names in text with <at>Name</at>
      let bodyText = text;
      for (const m of mentions) {
        bodyText = bodyText.replace(
          new RegExp(`\\*\\*${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*`, 'g'),
          `<at>${m.name}</at>`
        );
      }

      const card = {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                { type: "TextBlock", text: title, weight: "Bolder", size: "Medium" },
                { type: "TextBlock", text: bodyText, wrap: true },
              ],
              msteams: { entities: mentionEntities },
            },
          },
        ],
      };

      const response = await fetch(workflows, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });

      if (response.ok) return true;
      console.error(`[Teams Workflows] Error: ${response.status}`);
    } catch (error) {
      console.error("[Teams Workflows] Failed:", error);
    }
  }

  // Fallback to classic webhook (no @mentions, just bold names in text)
  return sendTeamsMessage(title, text);
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
