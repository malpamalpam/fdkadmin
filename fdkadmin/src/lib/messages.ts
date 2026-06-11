const DEFAULT_SIGNATURE_TEMPLATE = `{regards}

{fullName}
{position}

Fundacja Firma Dla Każdego

ul. Lwowska 17/4
00-660 Warszawa
NIP: 5252625624

www.firmadlakazdego.pl`;

const REGARDS: Record<string, string> = {
  PL: "Z pozdrowieniami,",
  EN: "Best regards,",
  RU: "С уважением,",
};

interface SignatureContext {
  language: string;
  senderName: string;
  senderPosition?: string | null;
  signatureTemplate?: string | null; // from Settings (global template)
  senderSignatureBlock?: string | null; // per-user override
}

export function buildSignature(ctx: SignatureContext): string {
  // Per-user override takes priority
  if (ctx.senderSignatureBlock) return ctx.senderSignatureBlock;

  const template = ctx.signatureTemplate || DEFAULT_SIGNATURE_TEMPLATE;
  const regards = REGARDS[ctx.language] || REGARDS.PL;

  return template
    .replace(/\{regards\}/g, regards)
    .replace(/\{fullName\}/g, ctx.senderName)
    .replace(/\{position\}/g, ctx.senderPosition || "")
    .replace(/\n{3,}/g, "\n\n"); // clean up empty lines if no position
}

// Relative time phrasing with correct declension
function relativeTimePL(hours: number): string {
  if (hours === 1) return "w ciągu około 1 godziny";
  return `w ciągu około ${hours} godzin`;
}

function relativeTimeEN(hours: number): string {
  if (hours === 1) return "within approximately 1 hour";
  return `within approximately ${hours} hours`;
}

function relativeTimeRU(hours: number): string {
  if (hours === 1) return "в течение примерно 1 часа";
  return `в течение примерно ${hours} часов`;
}

interface FirstContactContext {
  salutation: "PAN" | "PANI";
  language: "PL" | "EN" | "RU";
  senderGender: "K" | "M";
  senderName: string;
  senderPosition?: string | null;
  signatureTemplate?: string | null;
  senderSignatureBlock?: string | null;
  responseTime: number; // hours
  deadlineTime?: string; // formatted time e.g. "14:30" - used in absolute mode
  useRelativeTime: boolean;
}

export function generateFirstContactMessage(ctx: FirstContactContext): string {
  const sig = buildSignature(ctx);

  if (ctx.language === "PL") {
    const salut = ctx.salutation === "PANI" ? "Pani" : "Pana";
    const busy = ctx.senderGender === "K" ? "zajęta" : "zajęty";
    const grateful = ctx.senderGender === "K" ? "wdzięczna" : "wdzięczny";
    const timePhrase = ctx.useRelativeTime
      ? `— ${relativeTimePL(ctx.responseTime)}.`
      : `— najpóźniej do godziny ${ctx.deadlineTime}.`;

    return `Dzień dobry,

Dziękuję za wiadomość. W tym momencie jestem ${busy}, ale zajmę się ${salut} sprawą tak szybko, jak to możliwe ${timePhrase}

Dziękuję i będę ${grateful} za cierpliwość.

${sig}`;
  }

  if (ctx.language === "EN") {
    const salut = ctx.salutation === "PANI" ? "Madam" : "Sir";
    const timePhrase = ctx.useRelativeTime
      ? `— ${relativeTimeEN(ctx.responseTime)}.`
      : `— no later than ${ctx.deadlineTime}.`;

    return `Dear ${salut},

Thank you for your message. I am currently occupied, but I will attend to your matter as soon as possible ${timePhrase}

Thank you for your patience.

${sig}`;
  }

  // RU
  const busy = ctx.senderGender === "K" ? "занята" : "занят";
  const timePhrase = ctx.useRelativeTime
    ? `— ${relativeTimeRU(ctx.responseTime)}.`
    : `— не позднее ${ctx.deadlineTime}.`;

  return `Здравствуйте,

Спасибо за Ваше сообщение. В данный момент я ${busy}, но займусь Вашим вопросом как можно скорее ${timePhrase}

Благодарю за терпение.

${sig}`;
}

interface ExtensionContext {
  salutation: "PAN" | "PANI";
  language: "PL" | "EN" | "RU";
  senderName: string;
  senderPosition?: string | null;
  signatureTemplate?: string | null;
  senderSignatureBlock?: string | null;
  newDeadlineTime: string; // formatted time
}

export function generateExtensionMessage(ctx: ExtensionContext): string {
  const sig = buildSignature(ctx);

  if (ctx.language === "PL") {
    const salut = ctx.salutation === "PANI" ? "Pani" : "Pana";
    const salut2 = ctx.salutation === "PANI" ? "Pani" : "Pan";

    return `Dzień dobry,

W nawiązaniu do wcześniejszej wiadomości — ${salut} sprawa wymaga nieco więcej czasu. Odpowiedź otrzyma ${salut2} najpóźniej do godziny ${ctx.newDeadlineTime}.

Przepraszam za opóźnienie i dziękuję za cierpliwość.

${sig}`;
  }

  if (ctx.language === "EN") {
    const salut = ctx.salutation === "PANI" ? "Madam" : "Sir";

    return `Dear ${salut},

Following up on my previous message — your matter requires a bit more time. You will receive a response no later than ${ctx.newDeadlineTime}.

I apologize for the delay and thank you for your patience.

${sig}`;
  }

  // RU
  return `Здравствуйте,

В продолжение моего предыдущего сообщения — Ваш вопрос требует немного больше времени. Вы получите ответ не позднее ${ctx.newDeadlineTime}.

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
