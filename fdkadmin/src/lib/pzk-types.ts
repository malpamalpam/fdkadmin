// ─── PZK — Panel Zamknięcia Klienta — TypeScript types ───────────────────────

export type PzkPanel = "PZK" | "PZK_TUTLO";

export type PzkClientType =
  | "STANDARD_KADRY"
  | "OBCOKRAJOWIEC_HR"
  | "OBCOKRAJOWIEC_HR_ENG"
  | "TUTLO_PL"
  | "TUTLO_OBCOKRAJOWIEC";

export const PZK_CLIENT_TYPE_LABELS: Record<PzkClientType, string> = {
  STANDARD_KADRY: "Standard - Kadry",
  OBCOKRAJOWIEC_HR: "Obcokrajowiec - HR",
  OBCOKRAJOWIEC_HR_ENG: "Obcokrajowiec - HR.ENG",
  TUTLO_PL: "TUTLO - PL",
  TUTLO_OBCOKRAJOWIEC: "TUTLO - Obcokrajowiec",
};

// ─── Field value color mapping ────────────────────────────────────────────────

export type FieldColor = "green" | "yellow" | "red" | "gray" | null;

const GREEN_VALUES = new Set([
  "Oryginał", "Komplet", "Dezaktywowane", "Wysłane", "Zamknięte",
  "Niepotrzebne", "Podpisana i wysłana", "Nie posiada PESEL",
  "Opłacono", "Opłacono - z subkonta", "Opłacono - wpłata zewnętrzna", "Opłacono - gotówka",
]);
const YELLOW_VALUES = new Set([
  "Skan", "Do uzupełnienia", "Do wysłania", "Aktywne", "Do wpisania",
]);
const RED_VALUES = new Set([
  "Nie uzyskano", "Nie opłacono", "Odmowa", "Potwierdzenie - brak",
]);
const GRAY_VALUES = new Set(["Nie dotyczy"]);

export function getFieldColor(value: string | undefined | null): FieldColor {
  if (!value) return null;
  if (value.startsWith("Nie uzyskano")) return "red";
  if (value.startsWith("Nie opłacono")) return "red";
  if (GREEN_VALUES.has(value)) return "green";
  if (YELLOW_VALUES.has(value)) return "yellow";
  if (RED_VALUES.has(value)) return "red";
  if (GRAY_VALUES.has(value)) return "gray";
  return null; // bare data (dates, amounts, free text) — no color
}

// ─── Module 2: Administration ─────────────────────────────────────────────────

export type DocumentStatus =
  | "Oryginał" | "Skan" | "Do uzupełnienia" | "Nie uzyskano" | "Nie dotyczy" | "Odmowa";

export type AccessStatus = "Aktywne" | "Dezaktywowane" | "Nie dotyczy";

export type PaymentStatus =
  | "Komplet"
  | "Opłacono - z subkonta"
  | "Opłacono - wpłata zewnętrzna"
  | "Opłacono - gotówka"
  | string; // "Nie opłacono:…"

export type Branza =
  | "Lektor" | "IT" | "E-commerce" | "Grafik" | "Architekt"
  | "Fotograf" | "Tłumacz" | "Coaching" | "Consulting" | "inne";

export interface Mod2Admin {
  // 2A
  infoSource?: string;
  wypowiedzenie?: "Oryginał" | "Skan" | "Do uzupełnienia" | "Nie uzyskano";
  dataStartuCRM?: string; // ISO date
  // 2B
  pesel?: "Do wpisania" | "Komplet" | "Do uzupełnienia" | "Beneficjent nie posiada PESEL";
  daneKontaktowe?: "Do wpisania" | "Komplet" | "Do uzupełnienia" | "Brak adresu zamieszkania" | "Brak telefonu";
  branza?: Branza;
  umowa?: DocumentStatus;
  rodo?: DocumentStatus;
  oswiadczenieTworcy?: DocumentStatus;
  krk?: DocumentStatus;
  oswiadczenieElektroniczne?: DocumentStatus;
  // 2C
  benefitSystem?: AccessStatus;
  kontoMBank?: AccessStatus;
  kontoCRM?: AccessStatus;
  biezaceSwrodkiMBank?: string; // amount as string; 0 → green, >0 → yellow
  biezaceSwrodkiKomentarz?: string;
}

// ─── Module 3: Kadry ──────────────────────────────────────────────────────────

export interface Mod3Kadry {
  // 3A
  brakiKadryDok?: string; // "Do wpisania" | "Komplet" | "Nie uzyskano:…"
  brakiKadryDokUzup?: string; // free text of what was completed
  brakiKadryPlatnosci?: string; // amount
  brakiKadryPlatnosciOplatyZa?: string;
  brakiKadryPlatnosciStatus?: PaymentStatus;
  legitymacja?: string; // "Do wpisania" | "Komplet" | "Nie uzyskano:…"
  // 3B
  brakiUZPlatnosci?: string; // amount or "Nie dotyczy"
  brakiUZPlatnosciOplatyZa?: string;
  brakiUZPlatnosciStatus?: PaymentStatus;
  zwua?: "Wysłane" | "Do uzupełnienia";
  dataZwua?: string; // ISO date
  komentarzKadrowy?: string;
}

// ─── Module 4: Księgowość ─────────────────────────────────────────────────────

export interface Mod4Ksieg {
  // 4A
  brakiKsiegDok?: string; // "Do wpisania" | "Komplet" | "Nie uzyskano"
  brakiKsiegDokUzup?: string;
  // 4B
  brakiKsiegPlatnosci?: string; // amount
  brakiKsiegPlatnosciOplatyZa?: string;
  brakiKsiegPlatnosciStatus?: PaymentStatus;
  komentarzKsieg?: string;
}

// ─── Module 5: Legalizacja ────────────────────────────────────────────────────

export interface Mod5Legal {
  // 5A
  brakiLegalDok?: string;
  brakiLegalDokUzup?: string;
  // 5B
  brakiLegalPlatnosci?: string;
  brakiLegalPlatnosciOplatyZa?: string;
  brakiLegalPlatnosciStatus?: PaymentStatus;
  komentarzLegal?: string;
}

// ─── Module 6: Płatności ──────────────────────────────────────────────────────

export interface Mod6Platnosci {
  // 6A
  oplatyWspolpraca?: string; // amount
  oplatyWspolpracaZaOkres?: string;
  oplatyWspolpracaStatus?: PaymentStatus;
  // 6B
  oplatyBenefit?: string; // amount or "Nie dotyczy"
  oplatyBenefitZaOkres?: string; // "Nie dotyczy" if benefit ND
  oplatyBenefitStatus?: PaymentStatus; // "Nie dotyczy" if benefit ND
}

// ─── Module 7: Umowy ──────────────────────────────────────────────────────────

export interface Mod7Umowy {
  // 7A B2B
  b2bKontrahent?: string; // text or "Nie dotyczy"
  b2bDataRozpoczecia?: string; // ISO date
  b2bWypowiedzenie?: "Wysłane" | "Do wysłania" | "Niepotrzebne";
  b2bDataWypowiedzenia?: string;
  // 7B Najem
  najmUmowa?: string; // text or "Nie dotyczy"
  najmDataRozpoczecia?: string;
  najmWypowiedzenie?: "Wysłane" | "Do wysłania" | "Niepotrzebne";
  najmDataWypowiedzenia?: string;
}

// ─── Module 8: Inne ───────────────────────────────────────────────────────────

export interface Mod8Inne {
  // 8A Bramki płatności
  bramkiRodzaj?: "PayU" | "Stripe" | "inne" | "Nie dotyczy";
  bramkiStatus?: "Aktywne" | "Zamknięte" | "Potwierdzenie - dostarczone" | "Potwierdzenie - brak";
  // 8B Domena/Hosting
  domenaRodzaj?: "Cesja" | "Nie dotyczy";
  domenaStatus?: "Do uzupełnienia" | "Podpisana i wysłana" | "Niepotrzebne";
}

// ─── Composed PzkCase type (frontend) ────────────────────────────────────────

export interface PzkCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  panel: PzkPanel;
  lastName: string;
  firstNames: string;
  benefEmail: string | null;
  clientType: PzkClientType;
  responsibleWorker: string | null;
  cooperationEndsAt: string | null;
  withdrawnFromNotice: boolean;
  createdById: string;
  createdByName: string;
  mod2Admin: Mod2Admin | null;
  mod3Kadry: Mod3Kadry | null;
  mod4Ksieg: Mod4Ksieg | null;
  mod5Legal: Mod5Legal | null;
  mod6Platnosci: Mod6Platnosci | null;
  mod7Umowy: Mod7Umowy | null;
  mod8Inne: Mod8Inne | null;
  mod1Closed: boolean;
  mod2Closed: boolean;
  mod3AClosed: boolean;
  mod3BClosed: boolean;
  mod4Closed: boolean;
  mod5Closed: boolean;
  mod6Closed: boolean;
  mod7AClosed: boolean;
  mod7BClosed: boolean;
  mod8Closed: boolean;
  emailInitialSent: boolean;
  emailMid15Sent: boolean;
  emailFinal28Sent: boolean;
  initialDeadline: string | null;
  isUrgent: boolean;
  urgentLabel: string | null;
}

// ─── Module permission map ────────────────────────────────────────────────────
// Which departments can edit which module

export const MODULE_DEPT_MAP: Record<string, string[]> = {
  mod1: ["ADMINISTRACJA", "TUTLO"],
  mod2: ["ADMINISTRACJA", "TUTLO"],
  mod3: ["KADRY"],
  mod4: ["KSIEGOWOSC"],
  mod5: ["LEGALIZACJA"],
  mod6: ["OPLATY"],
  mod7: ["B2B"],
  mod8: ["ADMINISTRACJA", "TUTLO", "B2B"],
};

export function canEditModule(userDept: string | null, userRole: string, moduleKey: string): boolean {
  if (userRole === "ADMIN" || userRole === "SUPERVISOR") return true;
  if (!userDept) return false;
  const allowed = MODULE_DEPT_MAP[moduleKey] || [];
  return allowed.includes(userDept);
}

// ─── Status color helpers for amount fields ───────────────────────────────────

export function getAmountColor(
  amount: string | undefined,
  paymentStatus?: PaymentStatus
): FieldColor {
  if (!amount && amount !== "0") return null;
  // If payment status is green → override amount to green
  if (paymentStatus) {
    const sc = getFieldColor(paymentStatus);
    if (sc === "green") return "green";
    if (paymentStatus.startsWith("Nie opłacono")) return "red";
  }
  const n = parseFloat(amount.replace(",", "."));
  if (isNaN(n)) return null;
  if (n === 0) return "green";
  return "yellow";
}
