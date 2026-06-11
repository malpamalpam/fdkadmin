interface MessageContext {
  salutation: "PAN" | "PANI";
  language: "PL" | "EN" | "RU";
  senderGender: "K" | "M";
  senderName: string;
  senderPosition?: string | null;
  senderSignature?: string | null;
  deadline: string; // formatted time string like "14:30"
}

function getSignature(ctx: MessageContext): string {
  if (ctx.senderSignature) return ctx.senderSignature;

  const regards: Record<string, string> = {
    PL: "Z pozdrowieniami,",
    EN: "Best regards,",
    RU: "С уважением,",
  };

  const lines = [
    "",
    regards[ctx.language] || regards.PL,
    ctx.senderName,
  ];
  if (ctx.senderPosition) lines.push(ctx.senderPosition);
  lines.push("");
  lines.push("Fundacja Firma Dla Każdego");
  lines.push("ul. Lwowska 17/4, 00-660 Warszawa");
  lines.push("www.firmadlakazdego.pl");

  return lines.join("\n");
}

export function generateFirstContactMessage(ctx: MessageContext): string {
  const sig = getSignature(ctx);

  if (ctx.language === "PL") {
    const salut = ctx.salutation === "PANI" ? "Pani" : "Pana";
    const salut2 = ctx.salutation === "PANI" ? "Pani" : "Pana";
    const busy = ctx.senderGender === "K" ? "zajęta" : "zajęty";
    const grateful = ctx.senderGender === "K" ? "wdzięczna" : "wdzięczny";

    return `Dzień dobry,

Dziękuję za wiadomość. W tym momencie jestem ${busy}, ale zajmę się ${salut} sprawą tak szybko, jak to możliwe — najpóźniej do godziny ${ctx.deadline}.

Dziękuję i będę ${grateful} za cierpliwość.
${sig}`;
  }

  if (ctx.language === "EN") {
    const salut = ctx.salutation === "PANI" ? "Madam" : "Sir";

    return `Dear ${salut},

Thank you for your message. I am currently occupied, but I will attend to your matter as soon as possible — no later than ${ctx.deadline}.

Thank you for your patience.
${sig}`;
  }

  // RU
  const busy = ctx.senderGender === "K" ? "занята" : "занят";

  return `Здравствуйте,

Спасибо за Ваше сообщение. В данный момент я ${busy}, но займусь Вашим вопросом как можно скорее — не позднее ${ctx.deadline}.

Благодарю за терпение.
${sig}`;
}

export function generateExtensionMessage(ctx: MessageContext & { newDeadline: string }): string {
  const sig = getSignature(ctx);

  if (ctx.language === "PL") {
    const salut = ctx.salutation === "PANI" ? "Pani" : "Pana";
    const salut2 = ctx.salutation === "PANI" ? "Pani" : "Pan";

    return `Dzień dobry,

W nawiązaniu do wcześniejszej wiadomości — ${salut} sprawa wymaga nieco więcej czasu. Odpowiedź otrzyma ${salut2} najpóźniej do godziny ${ctx.newDeadline}.

Przepraszam za opóźnienie i dziękuję za cierpliwość.
${sig}`;
  }

  if (ctx.language === "EN") {
    const salut = ctx.salutation === "PANI" ? "Madam" : "Sir";

    return `Dear ${salut},

Following up on my previous message — your matter requires a bit more time. You will receive a response no later than ${ctx.newDeadline}.

I apologize for the delay and thank you for your patience.
${sig}`;
  }

  // RU
  return `Здравствуйте,

В продолжение моего предыдущего сообщения — Ваш вопрос требует немного больше времени. Вы получите ответ не позднее ${ctx.newDeadline}.

Прошу прощения за задержку и благодарю за терпение.
${sig}`;
}

export function formatDeadlineTime(date: Date): string {
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  });
}
