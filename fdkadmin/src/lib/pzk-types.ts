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
  "Niepotrzebne", "Podpisana i wysłana", "Beneficjent nie posiada PESEL",
  "Opłacono", "Opłacono - z subkonta", "Opłacono - wpłata zewnętrzna", "Opłacono - gotówka",
  "Odmowa", // positive: beneficjent refused electronic form, paper doc in CRM
  "Na opłaty", "Na VAT", // mBank status — funds allocated
]);
const YELLOW_VALUES = new Set([
  "Skan", "Do uzupełnienia", "Do wysłania", "Aktywne", "Do wpisania",
  "Do wyzerowania", "Do wyjaśnienia",
]);
const RED_VALUES = new Set([
  "Nie uzyskano", "Potwierdzenie - brak",
  "Brak adresu zamieszkania", "Brak telefonu",
]);
const GRAY_VALUES = new Set(["Nie dotyczy"]);

export function getFieldColor(value: string | undefined | null): FieldColor {
  if (!value) return null;
  if (value.startsWith("Nie uzyskano")) return "red"; // includes "Nie uzyskano spłaty"
  if (value.startsWith("Nie opłacono")) return "yellow"; // "Nie opłacono: proszę uzupełnić" = action pending
  if (value.startsWith("Brak ")) return "red"; // "Brak adresu...", "Brak telefonu"
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
  | "Nie opłacono: proszę uzupełnić"
  | "Nie uzyskano spłaty"
  | string;

export type Branza =
  | "Lektor" | "IT" | "E-commerce" | "Grafik" | "Architekt"
  | "Fotograf" | "Tłumacz" | "Coaching" | "Consulting" | "inne";

export interface Mod2Admin {
  // 2A
  infoSource?: string;
  wypowiedzenie?: "Oryginał" | "Skan" | "Do uzupełnienia" | "Nie uzyskano";
  dataStartuCRM?: string; // ISO date
  // 2B
  pesel?: string;
  peselCustomText?: string;
  peselCustomColor?: FieldColor;
  daneKontaktowe?: string;
  daneKontaktoweCustomText?: string;
  daneKontaktoweCustomColor?: FieldColor;
  branza?: string;
  branzaCustomText?: string;
  branzaCustomColor?: FieldColor;
  umowa?: DocumentStatus;
  umowaKomentarz?: string;
  rodo?: DocumentStatus;
  rodoKomentarz?: string;
  oswiadczenieTworcy?: DocumentStatus;
  oswiadczenieTworcyKomentarz?: string;
  krk?: string;
  krkCustomText?: string;
  krkCustomColor?: FieldColor;
  krkKomentarz?: string;
  oswiadczenieElektroniczne?: DocumentStatus;
  oswiadczenieElektroniczneKomentarz?: string;
  // 2C
  benefitSystem?: AccessStatus;
  kontoMBank?: AccessStatus;
  kontoCRM?: AccessStatus;
  biezaceSwrodkiMBank?: string; // amount as string
  biezaceSwrodkiStatus?: string; // "Do wyzerowania" | "Na opłaty" | "Na VAT" | "Do wyjaśnienia"
  biezaceSwrodkiKomentarz?: string;
}

// ─── Module 3: Kadry — sprawy kadrowe ────────────────────────────────────────
// ─── Module 4: Kadry — ubezpieczenia ─────────────────────────────────────────
// Both stored in the same JSON blob (mod3Kadry in DB)

export interface Mod3Kadry {
  // 3A — Dokumenty
  brakiKadryDok?: string; // "Do wpisania" | "Komplet" | "Nie uzyskano:…"
  brakiKadryDokKomentarz?: string;
  brakiKadryDokUzup?: string; // free text of what was completed
  brakiKadryDokUzupKomentarz?: string;
  // 3B — Płatności
  brakiKadryPlatnosci?: string; // amount
  brakiKadryPlatnosciKomentarz?: string;
  brakiKadryPlatnosciOplatyZa?: string;
  brakiKadryPlatnosciOplatyZaKomentarz?: string;
  brakiKadryPlatnosciStatus?: PaymentStatus;
  brakiKadryPlatnosciNieOplacono?: string; // remaining amount if partial
  brakiKadryPlatnosciNieUzyskano?: string; // permanently lost amount
  brakiKadryPlatnosciStatusKomentarz?: string;
  // 3C — Legitymacje
  legitymacja?: string; // "Do wpisania" | "Komplet" | "Nie dotyczy"
  legitymacjaKomentarz?: string;
  // 4A — Płatności UZ (UI module 4: ubezpieczenia)
  ubezpNieDotyczy?: boolean; // "Nie dotyczy — zamknij moduł"
  brakiUZPlatnosci?: string; // amount or "Nie dotyczy"
  brakiUZPlatnosciOplatyZa?: string;
  brakiUZPlatnosciStatus?: PaymentStatus;
  brakiUZPlatnosciNieOplacono?: string;
  brakiUZPlatnosciNieUzyskano?: string;
  // 4B — ZWUA
  zwua?: "Wysłane" | "Do uzupełnienia";
  dataZwua?: string; // ISO date
  komentarzKadrowy?: string;
}

// ─── Module 5: Księgowość (DB: mod4Ksieg) ────────────────────────────────────

export interface Mod4Ksieg {
  // 5A
  brakiKsiegDok?: string; // "Do wpisania" | "Komplet" | "Nie uzyskano"
  brakiKsiegDokUzup?: string;
  // 5B
  brakiKsiegPlatnosci?: string; // amount
  brakiKsiegPlatnosciOplatyZa?: string;
  brakiKsiegPlatnosciStatus?: PaymentStatus;
  brakiKsiegPlatnosciNieOplacono?: string;
  brakiKsiegPlatnosciNieUzyskano?: string;
  komentarzKsieg?: string;
}

// ─── Module 6: Legalizacja (DB: mod5Legal) ───────────────────────────────────

export interface Mod5Legal {
  legalNieDotyczy?: boolean; // "Nie dotyczy — zamknij moduł"
  // 6A
  brakiLegalDok?: string;
  brakiLegalDokUzup?: string;
  // 6B
  brakiLegalPlatnosci?: string;
  brakiLegalPlatnosciOplatyZa?: string;
  brakiLegalPlatnosciStatus?: PaymentStatus;
  brakiLegalPlatnosciNieOplacono?: string;
  brakiLegalPlatnosciNieUzyskano?: string;
  komentarzLegal?: string;
}

// ─── Module 7: Płatności (DB: mod6Platnosci) ─────────────────────────────────

export interface Mod6Platnosci {
  // 7A
  oplatyWspolpraca?: string; // amount
  oplatyWspolpracaZaOkres?: string;
  oplatyWspolpracaStatus?: PaymentStatus;
  // 7B — Multisport
  oplatyMultisport?: string; // amount or "Nie dotyczy"
  oplatyMultisportZaOkres?: string;
  oplatyMultisportStatus?: PaymentStatus;
  // 7C — Medicover
  oplatyMedicover?: string; // amount or "Nie dotyczy"
  oplatyMedicoverZaOkres?: string;
  oplatyMedicoverStatus?: PaymentStatus;
  // Legacy fields (backward compat — will be migrated)
  oplatyBenefit?: string;
  oplatyBenefitZaOkres?: string;
  oplatyBenefitStatus?: PaymentStatus;
}

// ─── Module 8: Umowy (DB: mod7Umowy) ─────────────────────────────────────────

export interface B2BEntry {
  kontrahent?: string;
  dataRozpoczecia?: string;
  wypowiedzenie?: "Wysłane" | "Do wysłania" | "Niepotrzebne";
  dataWypowiedzenia?: string;
}

export interface NajemEntry {
  umowa?: string;
  dataRozpoczecia?: string;
  wypowiedzenie?: "Wysłane" | "Do wysłania" | "Niepotrzebne";
  dataWypowiedzenia?: string;
}

export interface Mod7Umowy {
  // 8A B2B — multi-entry
  b2bEntries?: B2BEntry[];
  // 8B Najem — multi-entry
  najmEntries?: NajemEntry[];
  // Legacy single-entry fields (backward compat)
  b2bKontrahent?: string;
  b2bDataRozpoczecia?: string;
  b2bWypowiedzenie?: "Wysłane" | "Do wysłania" | "Niepotrzebne";
  b2bDataWypowiedzenia?: string;
  najmUmowa?: string;
  najmDataRozpoczecia?: string;
  najmWypowiedzenie?: "Wysłane" | "Do wysłania" | "Niepotrzebne";
  najmDataWypowiedzenia?: string;
}

// ─── Module 9: Inne (DB: mod8Inne) ───────────────────────────────────────────

export interface BramkaEntry {
  rodzaj?: "PayU" | "Stripe" | "inne" | "Nie dotyczy";
  status?: "Aktywne" | "Zamknięte" | "Potwierdzenie - dostarczone" | "Potwierdzenie - brak";
}

export interface DomenaEntry {
  rodzaj?: "Cesja" | "Nie dotyczy";
  status?: "Do uzupełnienia" | "Podpisana i wysłana" | "Niepotrzebne";
}

export interface Mod8Inne {
  // 9A Bramki płatności — multi-entry
  bramkiEntries?: BramkaEntry[];
  // 9B Domena/Hosting — multi-entry
  domenaEntries?: DomenaEntry[];
  // Legacy single-entry fields (backward compat)
  bramkiRodzaj?: "PayU" | "Stripe" | "inne" | "Nie dotyczy";
  bramkiStatus?: "Aktywne" | "Zamknięte" | "Potwierdzenie - dostarczone" | "Potwierdzenie - brak";
  domenaRodzaj?: "Cesja" | "Nie dotyczy";
  domenaStatus?: "Do uzupełnienia" | "Podpisana i wysłana" | "Niepotrzebne";
}

// ─── Contact log entry ──────────────────────────────────────────────────────

export interface ContactEntry {
  id: string;
  date: string; // ISO date
  subject: string;
  status: "W trakcie" | "Zakończono";
  comment: string;
  worker: string; // fullName of creator
  createdAt: string; // ISO datetime
}

// ─── Composed PzkCase type (frontend) ────────────────────────────────────────
//
// DB column names are kept stable — UI renumbering is handled in the frontend.
// Mapping: DB flag → UI module
//   mod1Closed        → 1. Beneficjent
//   mod2*Closed       → 2. Administracja (2A/2B/2C)
//   mod3Closed        → 3. Kadry sprawy (parent)
//   mod3AClosed       → 3A Dokumenty
//   mod3PayClosed     → 3B Płatności
//   mod3LegitClosed   → 3C Legitymacje
//   mod3BClosed       → 4. Kadry ubezpieczenia (parent)
//   mod4UbezpAClosed  → 4A Płatności UZ
//   mod4UbezpBClosed  → 4B ZWUA
//   mod4Closed        → 5. Księgowość (parent)
//   mod4AClosed/BClosed → 5A/5B
//   mod5Closed        → 6. Legalizacja (parent)
//   mod5AClosed/BClosed → 6A/6B
//   mod6Closed        → 7. Płatności (parent)
//   mod6AClosed/BClosed/CClosed → 7A/7B/7C
//   mod7AClosed       → 8A Umowy B2B
//   mod7BClosed       → 8B Umowy najmu
//   mod8Closed        → 9. Inne (parent)
//   mod8AClosed/BClosed → 9A/9B

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
  caseClosed: boolean;
  internalComment: string | null;
  contactLog: ContactEntry[] | null;
  createdById: string;
  createdByName: string;
  mod2Admin: Mod2Admin | null;
  mod3Kadry: Mod3Kadry | null;
  mod4Ksieg: Mod4Ksieg | null;
  mod5Legal: Mod5Legal | null;
  mod6Platnosci: Mod6Platnosci | null;
  mod7Umowy: Mod7Umowy | null;
  mod8Inne: Mod8Inne | null;
  // Close flags
  mod1Closed: boolean;
  mod2Closed: boolean;
  mod2AClosed: boolean;
  mod2BClosed: boolean;
  mod2CClosed: boolean;
  mod3Closed: boolean;
  mod3AClosed: boolean;
  mod3PayClosed: boolean;
  mod3LegitClosed: boolean;
  mod3BClosed: boolean;
  mod4UbezpAClosed: boolean;
  mod4UbezpBClosed: boolean;
  mod4Closed: boolean;
  mod4AClosed: boolean;
  mod4BClosed: boolean;
  mod5Closed: boolean;
  mod5AClosed: boolean;
  mod5BClosed: boolean;
  mod6Closed: boolean;
  mod6AClosed: boolean;
  mod6BClosed: boolean;
  mod6CClosed: boolean;
  mod7AClosed: boolean;
  mod7BClosed: boolean;
  mod8Closed: boolean;
  mod8AClosed: boolean;
  mod8BClosed: boolean;
  emailInitialSent: boolean;
  emailMid15Sent: boolean;
  emailFinal28Sent: boolean;
  initialDeadline: string | null;
  isUrgent: boolean;
  urgentLabel: string | null;
}

// ─── Module permission map ────────────────────────────────────────────────────
// Which departments can edit which module (perm key → dept list)

export const MODULE_DEPT_MAP: Record<string, string[]> = {
  mod1: ["ADMINISTRACJA", "TUTLO"],
  mod2: ["ADMINISTRACJA", "TUTLO"],
  mod3: ["KADRY", "HR", "HR_ENG", "TUTLO"],  // Kadry sprawy — accessible by all kadry/HR + Tutlo
  mod3b: ["KADRY", "HR", "HR_ENG", "TUTLO"], // Kadry ubezpieczenia — same depts (shared JSON blob)
  mod4: ["KSIEGOWOSC", "TUTLO_KSIEGOWOSC"],  // UI module 5: Księgowość
  mod5: ["LEGALIZACJA"],                      // UI module 6: Legalizacja
  mod6: ["OPLATY", "TUTLO_OPLATY"],           // UI module 7: Płatności
  mod7: ["B2B"],                              // UI module 8: Umowy — B2B dept edits, OPLATY gets notifications
  mod8: ["ADMINISTRACJA", "TUTLO"],           // UI module 9: Inne
};

export function canEditModule(
  userDept: string | null,
  userRole: string,
  moduleKey: string,
  extraDepts?: string[],
): boolean {
  if (userRole === "ADMIN" || userRole === "SUPERVISOR") return true;
  const allowed = MODULE_DEPT_MAP[moduleKey] || [];
  if (userDept && allowed.includes(userDept)) return true;
  if (extraDepts?.some((d) => allowed.includes(d))) return true;
  return false;
}

// ─── Closeable unit counting ────────────────────────────────────────────────
// 20 closeable sub-module units for the "Moduły: x/20" counter

export const ALL_CLOSE_FLAGS = [
  "mod1Closed",                               // 1. Beneficjent
  "mod2AClosed", "mod2BClosed", "mod2CClosed", // 2. Administracja
  "mod3AClosed", "mod3PayClosed", "mod3LegitClosed", // 3. Kadry sprawy
  "mod4UbezpAClosed", "mod4UbezpBClosed",      // 4. Kadry ubezpieczenia
  "mod4AClosed", "mod4BClosed",                // 5. Księgowość
  "mod5AClosed", "mod5BClosed",                // 6. Legalizacja
  "mod6AClosed", "mod6BClosed", "mod6CClosed", // 7. Płatności
  "mod7AClosed", "mod7BClosed",                // 8. Umowy
  "mod8AClosed", "mod8BClosed",                // 9. Inne
] as const;

export const TOTAL_CLOSE_UNITS = ALL_CLOSE_FLAGS.length; // 20

export function closedUnitCount(c: PzkCase): number {
  let count = 0;
  const rec = c as unknown as Record<string, unknown>;
  for (const flag of ALL_CLOSE_FLAGS) {
    // mod3BClosed (ubezp parent) closes all ubezp sub-modules
    if (flag === "mod4UbezpAClosed" || flag === "mod4UbezpBClosed") {
      if (c.mod3BClosed || rec[flag]) count++;
    } else {
      if (rec[flag]) count++;
    }
  }
  return count;
}

// ─── Braki collector for mail generator ──────────────────────────────────────

export function collectBraki(
  c: PzkCase,
  userDept: string | null,
  userRole: string,
  extraDepts?: string[],
): string[] {
  const braki: string[] = [];
  const isAdminLike = userRole === "ADMIN" || userRole === "SUPERVISOR";

  function addYR(label: string, value: string | undefined) {
    if (!value) return;
    const col = getFieldColor(value);
    if (col === "yellow" || col === "red") braki.push(`${label}: ${value}`);
  }

  function addAmount(label: string, amount: string | undefined, paymentStatus?: string) {
    if (!amount || amount === "Nie dotyczy") return;
    if (paymentStatus) {
      const sc = getFieldColor(paymentStatus);
      if (sc === "green") return;
    }
    const n = parseFloat(amount.replace(",", "."));
    if (!isNaN(n) && n > 0) braki.push(`${label}: ${amount} zł`);
  }

  // mod2Admin (UI module 2)
  if (isAdminLike || canEditModule(userDept, userRole, "mod2", extraDepts)) {
    const m = (c.mod2Admin || {}) as Mod2Admin;
    addYR("Wypowiedzenie", m.wypowiedzenie);
    addYR("PESEL", m.pesel);
    addYR("Dane kontaktowe", m.daneKontaktowe);
    addYR("Umowa", m.umowa);
    addYR("RODO", m.rodo);
    addYR("Oświadczenie twórcy", m.oswiadczenieTworcy);
    addYR("KRK", m.krk);
    addYR("Oświadczenie elektroniczne", m.oswiadczenieElektroniczne);
    addYR("Benefit System", m.benefitSystem);
    addYR("Konto mBank", m.kontoMBank);
    addYR("Konto CRM", m.kontoCRM);
    addAmount("Bieżące środki mBank", m.biezaceSwrodkiMBank);
  }

  // mod3Kadry — UI modules 3 + 4
  if (isAdminLike || canEditModule(userDept, userRole, "mod3", extraDepts)) {
    const m = (c.mod3Kadry || {}) as Mod3Kadry;
    // Module 3: sprawy kadrowe
    if (m.brakiKadryDok && m.brakiKadryDok !== "Komplet")
      braki.push(`Braki HR/Kadry – dokumenty: ${m.brakiKadryDok}`);
    addAmount("Braki HR/Kadry – płatności", m.brakiKadryPlatnosci, m.brakiKadryPlatnosciStatus);
    addYR("Status opłat kadrowych", m.brakiKadryPlatnosciStatus);
    if (m.legitymacja) addYR("Legitymacja", m.legitymacja);
    // Module 4: ubezpieczenia (skip if ND)
    if (!m.ubezpNieDotyczy) {
      if (m.brakiUZPlatnosci !== "Nie dotyczy") addAmount("Braki UZ – płatności", m.brakiUZPlatnosci, m.brakiUZPlatnosciStatus);
      addYR("Status opłat UZ", m.brakiUZPlatnosciStatus);
      addYR("ZWUA", m.zwua);
    }
  }

  // mod4Ksieg (UI module 5)
  if (isAdminLike || canEditModule(userDept, userRole, "mod4", extraDepts)) {
    const m = (c.mod4Ksieg || {}) as Mod4Ksieg;
    if (m.brakiKsiegDok && m.brakiKsiegDok !== "Komplet")
      braki.push(`Braki księgowość – dokumenty: ${m.brakiKsiegDok}`);
    addAmount("Braki księgowość – płatności", m.brakiKsiegPlatnosci, m.brakiKsiegPlatnosciStatus);
    addYR("Status opłat księgowych", m.brakiKsiegPlatnosciStatus);
  }

  // mod5Legal (UI module 6) — skip if legalNieDotyczy
  if (isAdminLike || canEditModule(userDept, userRole, "mod5", extraDepts)) {
    const m = (c.mod5Legal || {}) as Mod5Legal;
    if (!m.legalNieDotyczy) {
      if (m.brakiLegalDok && m.brakiLegalDok !== "Komplet")
        braki.push(`Braki legalizacja – dokumenty: ${m.brakiLegalDok}`);
      addAmount("Braki legalizacja – płatności", m.brakiLegalPlatnosci, m.brakiLegalPlatnosciStatus);
      addYR("Status opłat legalizacji", m.brakiLegalPlatnosciStatus);
    }
  }

  // mod6Platnosci (UI module 7)
  if (isAdminLike || canEditModule(userDept, userRole, "mod6", extraDepts)) {
    const m = (c.mod6Platnosci || {}) as Mod6Platnosci;
    addAmount("Opłaty za współpracę", m.oplatyWspolpraca, m.oplatyWspolpracaStatus);
    addYR("Status opłat za współpracę", m.oplatyWspolpracaStatus);
    if (m.oplatyMultisport !== "Nie dotyczy") addAmount("Opłaty Multisport", m.oplatyMultisport, m.oplatyMultisportStatus);
    if (m.oplatyMultisportStatus !== "Nie dotyczy") addYR("Status opłat Multisport", m.oplatyMultisportStatus);
    if (m.oplatyMedicover !== "Nie dotyczy") addAmount("Opłaty Medicover", m.oplatyMedicover, m.oplatyMedicoverStatus);
    if (m.oplatyMedicoverStatus !== "Nie dotyczy") addYR("Status opłat Medicover", m.oplatyMedicoverStatus);
    // Legacy fallback
    if (m.oplatyBenefit && !m.oplatyMultisport && !m.oplatyMedicover) {
      if (m.oplatyBenefit !== "Nie dotyczy") addAmount("Opłaty Benefit", m.oplatyBenefit, m.oplatyBenefitStatus);
      if (m.oplatyBenefitStatus && m.oplatyBenefitStatus !== "Nie dotyczy") addYR("Status opłat Benefit", m.oplatyBenefitStatus);
    }
  }

  // mod7Umowy (UI module 8)
  if (isAdminLike || canEditModule(userDept, userRole, "mod7", extraDepts)) {
    const m = (c.mod7Umowy || {}) as Mod7Umowy;
    if (m.b2bEntries?.length) {
      m.b2bEntries.forEach((e, i) => { if (e.kontrahent !== "Nie dotyczy") addYR(`Wypowiedzenie B2B #${i+1}`, e.wypowiedzenie); });
    } else if (m.b2bKontrahent !== "Nie dotyczy") addYR("Wypowiedzenie B2B", m.b2bWypowiedzenie);
    if (m.najmEntries?.length) {
      m.najmEntries.forEach((e, i) => { if (e.umowa !== "Nie dotyczy") addYR(`Wypowiedzenie najmu #${i+1}`, e.wypowiedzenie); });
    } else if (m.najmUmowa !== "Nie dotyczy") addYR("Wypowiedzenie najmu", m.najmWypowiedzenie);
  }

  // mod8Inne (UI module 9)
  if (isAdminLike || canEditModule(userDept, userRole, "mod8", extraDepts)) {
    const m = (c.mod8Inne || {}) as Mod8Inne;
    if (m.bramkiEntries?.length) {
      m.bramkiEntries.forEach((e, i) => { if (e.rodzaj !== "Nie dotyczy") addYR(`Status bramki #${i+1}`, e.status); });
    } else if (m.bramkiRodzaj !== "Nie dotyczy") addYR("Status bramki płatności", m.bramkiStatus);
    if (m.domenaEntries?.length) {
      m.domenaEntries.forEach((e, i) => { if (e.rodzaj !== "Nie dotyczy") addYR(`Status domena #${i+1}`, e.status); });
    } else if (m.domenaRodzaj !== "Nie dotyczy") addYR("Status domena/hosting", m.domenaStatus);
  }

  return braki;
}

// ─── Color counting for summary ─────────────────────────────────────────────
// Fields in closed sub-modules count as green (not undefined).
// Fields in ubezp module with ubezpNieDotyczy count as gray.

export interface ColorCounts {
  green: number; yellow: number; red: number; gray: number;
  total: number; undefined: number;
}

export function countFieldColors(c: PzkCase): ColorCounts {
  const counts: ColorCounts = { green: 0, yellow: 0, red: 0, gray: 0, total: 0, undefined: 0 };

  function check(val: string | undefined | null, closed?: boolean) {
    counts.total++;
    if (closed) { counts.green++; return; }
    const col = getFieldColor(val);
    if (!col) { counts.undefined++; return; }
    counts[col]++;
  }
  function checkAmount(amount: string | undefined, status?: string, closed?: boolean) {
    counts.total++;
    if (closed) { counts.green++; return; }
    const col = getAmountColor(amount, status);
    if (!col) { counts.undefined++; return; }
    counts[col]++;
  }
  function checkGray(closed?: boolean) {
    counts.total++;
    if (closed) { counts.gray++; return; }
    counts.undefined++;
  }

  // Module 2: Administracja
  const m2 = (c.mod2Admin || {}) as Mod2Admin;
  const c2a = c.mod2AClosed;
  check(m2.wypowiedzenie, c2a);
  const c2b = c.mod2BClosed;
  check(m2.pesel, c2b); check(m2.daneKontaktowe, c2b);
  check(m2.umowa, c2b); check(m2.rodo, c2b); check(m2.oswiadczenieTworcy, c2b);
  check(m2.krk, c2b); check(m2.oswiadczenieElektroniczne, c2b);
  const c2c = c.mod2CClosed;
  check(m2.benefitSystem, c2c); check(m2.kontoMBank, c2c); check(m2.kontoCRM, c2c);
  checkAmount(m2.biezaceSwrodkiMBank, undefined, c2c); check(m2.biezaceSwrodkiStatus, c2c);

  // Module 3: Kadry sprawy
  const m3 = (c.mod3Kadry || {}) as Mod3Kadry;
  const c3a = c.mod3AClosed;
  // 3A has text fields — no color dots to count
  const c3b = c.mod3PayClosed;
  check(m3.brakiKadryPlatnosciStatus, c3b);
  checkAmount(m3.brakiKadryPlatnosci, m3.brakiKadryPlatnosciStatus, c3b);
  const c3c = c.mod3LegitClosed;
  check(m3.legitymacja, c3c);

  // Module 4: Kadry ubezpieczenia
  const ubezpClosed = c.mod3BClosed;
  const ubezpND = m3.ubezpNieDotyczy;
  const c4a = ubezpClosed || c.mod4UbezpAClosed;
  const c4b = ubezpClosed || c.mod4UbezpBClosed;
  if (ubezpND) {
    checkGray(true); // UZ payments → gray
    checkGray(true); // UZ amount → gray
    checkGray(true); // ZWUA → gray
  } else {
    check(m3.brakiUZPlatnosciStatus, c4a);
    checkAmount(m3.brakiUZPlatnosci, m3.brakiUZPlatnosciStatus, c4a);
    check(m3.zwua, c4b);
  }

  // Module 5: Księgowość (DB: mod4)
  const m4 = (c.mod4Ksieg || {}) as Mod4Ksieg;
  const c5b = c.mod4BClosed;
  check(m4.brakiKsiegPlatnosciStatus, c5b);
  checkAmount(m4.brakiKsiegPlatnosci, m4.brakiKsiegPlatnosciStatus, c5b);

  // Module 6: Legalizacja (DB: mod5)
  const m5 = (c.mod5Legal || {}) as Mod5Legal;
  const legalND = m5.legalNieDotyczy;
  const c6b = c.mod5BClosed;
  if (legalND) {
    checkGray(true); // legal payments → gray
    checkGray(true); // legal amount → gray
  } else {
    check(m5.brakiLegalPlatnosciStatus, c6b);
    checkAmount(m5.brakiLegalPlatnosci, m5.brakiLegalPlatnosciStatus, c6b);
  }

  // Module 7: Płatności (DB: mod6)
  const m6 = (c.mod6Platnosci || {}) as Mod6Platnosci;
  const c7a = c.mod6AClosed;
  check(m6.oplatyWspolpracaStatus, c7a);
  checkAmount(m6.oplatyWspolpraca, m6.oplatyWspolpracaStatus, c7a);
  const c7b = c.mod6BClosed;
  check(m6.oplatyMultisportStatus, c7b);
  const c7c = c.mod6CClosed;
  check(m6.oplatyMedicoverStatus, c7c);

  // Module 8: Umowy (DB: mod7)
  const m7 = (c.mod7Umowy || {}) as Mod7Umowy;
  const c8a = c.mod7AClosed;
  if (m7.b2bEntries?.length) m7.b2bEntries.forEach(e => check(e.wypowiedzenie, c8a));
  else { check(m7.b2bWypowiedzenie, c8a); }
  const c8b = c.mod7BClosed;
  if (m7.najmEntries?.length) m7.najmEntries.forEach(e => check(e.wypowiedzenie, c8b));
  else { check(m7.najmWypowiedzenie, c8b); }

  // Module 9: Inne (DB: mod8)
  const m8 = (c.mod8Inne || {}) as Mod8Inne;
  const c9a = c.mod8AClosed;
  if (m8.bramkiEntries?.length) m8.bramkiEntries.forEach(e => check(e.status, c9a));
  else { check(m8.bramkiStatus, c9a); }
  const c9b = c.mod8BClosed;
  if (m8.domenaEntries?.length) m8.domenaEntries.forEach(e => check(e.status, c9b));
  else { check(m8.domenaStatus, c9b); }

  return counts;
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
    if (paymentStatus.startsWith("Nie opłacono")) return "yellow"; // action pending
    if (paymentStatus.startsWith("Nie uzyskano")) return "red";
  }
  const n = parseFloat(amount.replace(",", "."));
  if (isNaN(n)) return null;
  if (n === 0) return "green";
  return "yellow";
}
