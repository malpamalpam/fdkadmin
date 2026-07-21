import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { canEditModule } from "@/lib/pzk-types";

const MODULE_KEYS = ["mod2Admin", "mod3Kadry", "mod4Ksieg", "mod5Legal", "mod6Platnosci", "mod7Umowy", "mod8Inne"] as const;
type ModuleKey = typeof MODULE_KEYS[number];

const MODULE_PERM_KEY: Record<ModuleKey, string> = {
  mod2Admin: "mod2",
  mod3Kadry: "mod3",
  mod4Ksieg: "mod4",
  mod5Legal: "mod5",
  mod6Platnosci: "mod6",
  mod7Umowy: "mod7",
  mod8Inne: "mod8",
};

// ─── Auto-close helpers ───────────────────────────────────────────────────────

const GREEN_GRAY_VALUES = new Set([
  "Oryginał", "Komplet", "Dezaktywowane", "Wysłane", "Zamknięte", "Niepotrzebne",
  "Podpisana i wysłana", "Beneficjent nie posiada PESEL",
  "Opłacono", "Opłacono - z subkonta", "Opłacono - wpłata zewnętrzna", "Opłacono - gotówka",
  "Nie dotyczy", "Odmowa",
]);

function isGG(v: string | undefined | null): boolean {
  if (!v) return false;
  return GREEN_GRAY_VALUES.has(v);
}

function get(data: Record<string, unknown>, k: string): string | undefined {
  return data[k] as string | undefined;
}

/**
 * Returns an object of close flags to auto-set after saving a module.
 * Only sets flags to `true` — never auto-opens a closed module.
 */
function computeAutoClose(moduleKey: string, data: Record<string, unknown>): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  if (moduleKey === "mod2Admin") {
    // 2A sub-module
    const fields2A = ["wypowiedzenie"];
    if (fields2A.every(f => isGG(get(data, f)))) result.mod2AClosed = true;
    // 2B sub-module
    const fields2B = ["pesel", "daneKontaktowe", "umowa", "rodo", "oswiadczenieTworcy", "krk", "oswiadczenieElektroniczne"];
    if (fields2B.every(f => isGG(get(data, f)))) result.mod2BClosed = true;
    // 2C sub-module
    const fields2C = ["benefitSystem", "kontoMBank", "kontoCRM"];
    if (fields2C.every(f => isGG(get(data, f)))) result.mod2CClosed = true;
    // Whole module closed when all sub-modules closed
    const allFields = [...fields2A, ...fields2B, ...fields2C];
    if (allFields.every(f => isGG(get(data, f)))) result.mod2Closed = true;
  }

  if (moduleKey === "mod3Kadry") {
    // 3A: sprawy kadrowe — check payment status
    if (isGG(get(data, "brakiKadryPlatnosciStatus"))) result.mod3AClosed = true;
    // 3B: ubezpieczenia — require explicit values, not empty
    const uzPlatnosci = get(data, "brakiUZPlatnosci");
    if (uzPlatnosci === "Nie dotyczy") {
      result.mod3BClosed = true;
    } else if (uzPlatnosci && isGG(get(data, "brakiUZPlatnosciStatus")) && isGG(get(data, "zwua"))) {
      result.mod3BClosed = true;
    }
  }

  if (moduleKey === "mod4Ksieg") {
    // 4A sub-module — documents
    // 4B sub-module — payments
    if (isGG(get(data, "brakiKsiegPlatnosciStatus"))) result.mod4BClosed = true;
    // Whole module
    if (isGG(get(data, "brakiKsiegPlatnosciStatus"))) result.mod4Closed = true;
  }

  if (moduleKey === "mod5Legal") {
    // 5B sub-module — payments
    if (isGG(get(data, "brakiLegalPlatnosciStatus"))) result.mod5BClosed = true;
    // Whole module
    if (isGG(get(data, "brakiLegalPlatnosciStatus"))) result.mod5Closed = true;
  }

  if (moduleKey === "mod6Platnosci") {
    // 6A — require explicit status
    if (isGG(get(data, "oplatyWspolpracaStatus"))) result.mod6AClosed = true;
    // 6B Multisport — only close if status is explicitly set (not empty)
    const multiStatus = get(data, "oplatyMultisportStatus");
    if (multiStatus && isGG(multiStatus)) result.mod6BClosed = true;
    // 6C Medicover
    const mediStatus = get(data, "oplatyMedicoverStatus");
    if (mediStatus && isGG(mediStatus)) result.mod6CClosed = true;
    // Whole module — all sub-modules must be explicitly closed
    const m6aOk = isGG(get(data, "oplatyWspolpracaStatus"));
    const m6bOk = multiStatus ? isGG(multiStatus) : false;
    const m6cOk = mediStatus ? isGG(mediStatus) : false;
    // Legacy fallback
    const legacyStatus = get(data, "oplatyBenefitStatus");
    const legacyOk = legacyStatus ? isGG(legacyStatus) : false;
    const benefitOk = (multiStatus || mediStatus) ? (m6bOk && m6cOk) : legacyOk;
    if (m6aOk && benefitOk) result.mod6Closed = true;
  }

  if (moduleKey === "mod7Umowy") {
    // Multi-entry B2B — require at least one entry with explicit status
    const b2bEntries = data.b2bEntries as Array<Record<string, unknown>> | undefined;
    if (b2bEntries?.length) {
      if (b2bEntries.every(e => (e.kontrahent as string) === "Nie dotyczy" || isGG(e.wypowiedzenie as string))) result.mod7AClosed = true;
    } else {
      // Legacy — only close if field is explicitly set
      const b2bWyp = get(data, "b2bWypowiedzenie");
      const b2bKont = get(data, "b2bKontrahent");
      if (b2bKont === "Nie dotyczy" || (b2bWyp && isGG(b2bWyp))) result.mod7AClosed = true;
    }
    // Multi-entry Najem
    const najmEntries = data.najmEntries as Array<Record<string, unknown>> | undefined;
    if (najmEntries?.length) {
      if (najmEntries.every(e => (e.umowa as string) === "Nie dotyczy" || isGG(e.wypowiedzenie as string))) result.mod7BClosed = true;
    } else {
      const najmWyp = get(data, "najmWypowiedzenie");
      const najmUm = get(data, "najmUmowa");
      if (najmUm === "Nie dotyczy" || (najmWyp && isGG(najmWyp))) result.mod7BClosed = true;
    }
  }

  if (moduleKey === "mod8Inne") {
    // Multi-entry bramki — require entries with explicit status
    const bramkiEntries = data.bramkiEntries as Array<Record<string, unknown>> | undefined;
    const bramkiOk = bramkiEntries?.length
      ? bramkiEntries.every(e => (e.rodzaj as string) === "Nie dotyczy" || isGG(e.status as string))
      : (get(data, "bramkiRodzaj") ? ((get(data, "bramkiRodzaj") === "Nie dotyczy") || isGG(get(data, "bramkiStatus"))) : false);
    // Multi-entry domeny
    const domenaEntries = data.domenaEntries as Array<Record<string, unknown>> | undefined;
    const domenaOk = domenaEntries?.length
      ? domenaEntries.every(e => (e.rodzaj as string) === "Nie dotyczy" || isGG(e.status as string))
      : (get(data, "domenaRodzaj") ? ((get(data, "domenaRodzaj") === "Nie dotyczy") || isGG(get(data, "domenaStatus"))) : false);
    if (bramkiOk) result.mod8AClosed = true;
    if (domenaOk) result.mod8BClosed = true;
    if (bramkiOk && domenaOk) result.mod8Closed = true;
  }

  return result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.pzkCase.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const moduleKey = body.moduleKey as ModuleKey;
  const moduleData = body.data as Record<string, unknown>;

  if (!MODULE_KEYS.includes(moduleKey as ModuleKey)) {
    return NextResponse.json({ error: "Invalid moduleKey" }, { status: 400 });
  }

  const permKey = MODULE_PERM_KEY[moduleKey];
  if (!canEditModule(session.dept, session.role, permKey)) {
    return NextResponse.json({ error: "Forbidden — brak uprawnień do tego modułu" }, { status: 403 });
  }

  const oldData = (existing as Record<string, unknown>)[moduleKey];

  try {
  // Compute which close flags to auto-set
  const autoClose = computeAutoClose(moduleKey, moduleData);
  // Only set flags that are true AND not already true on existing record
  const closeUpdates: Record<string, boolean> = {};
  for (const [flag, val] of Object.entries(autoClose)) {
    if (val && !(existing as Record<string, unknown>)[flag]) {
      closeUpdates[flag] = true;
    }
  }

  const updated = await prisma.pzkCase.update({
    where: { id },
    data: { [moduleKey]: moduleData, ...closeUpdates },
  });

  const historyEntries = [
    {
      caseId: id,
      changedBy: session.fullName,
      field: moduleKey,
      oldValue: oldData ? JSON.stringify(oldData) : null,
      newValue: JSON.stringify(moduleData),
    },
    ...Object.keys(closeUpdates).map(flag => ({
      caseId: id,
      changedBy: "System (auto-zamknięcie)",
      field: flag,
      oldValue: "false",
      newValue: "true",
    })),
  ];

  await prisma.pzkHistory.createMany({ data: historyEntries });

  return NextResponse.json(updated);
  } catch (err) {
    console.error("PZK module PATCH error:", err);
    return NextResponse.json({ error: "Błąd zapisu modułu" }, { status: 500 });
  }
}
