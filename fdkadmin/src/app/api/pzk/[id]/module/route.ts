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
  "Nie dotyczy",
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
    const fields = [
      "wypowiedzenie", "pesel", "daneKontaktowe",
      "umowa", "rodo", "oswiadczenieTworcy", "krk", "oswiadczenieElektroniczne",
      "benefitSystem", "kontoMBank", "kontoCRM",
    ];
    if (fields.every(f => isGG(get(data, f)))) result.mod2Closed = true;
  }

  if (moduleKey === "mod3Kadry") {
    // 3A: sprawy kadrowe — just check payment status
    if (isGG(get(data, "brakiKadryPlatnosciStatus"))) result.mod3AClosed = true;
    // 3B: ubezpieczenia — if UZ = ND, skip; otherwise check status + ZWUA
    if (get(data, "brakiUZPlatnosci") === "Nie dotyczy") {
      result.mod3BClosed = true;
    } else if (isGG(get(data, "brakiUZPlatnosciStatus")) && isGG(get(data, "zwua"))) {
      result.mod3BClosed = true;
    }
  }

  if (moduleKey === "mod4Ksieg") {
    if (isGG(get(data, "brakiKsiegPlatnosciStatus"))) result.mod4Closed = true;
  }

  if (moduleKey === "mod5Legal") {
    if (isGG(get(data, "brakiLegalPlatnosciStatus"))) result.mod5Closed = true;
  }

  if (moduleKey === "mod6Platnosci") {
    const benefitND = get(data, "oplatyBenefit") === "Nie dotyczy";
    const benefitOk = benefitND || isGG(get(data, "oplatyBenefitStatus"));
    if (isGG(get(data, "oplatyWspolpracaStatus")) && benefitOk) result.mod6Closed = true;
  }

  if (moduleKey === "mod7Umowy") {
    if (get(data, "b2bKontrahent") === "Nie dotyczy" || isGG(get(data, "b2bWypowiedzenie"))) {
      result.mod7AClosed = true;
    }
    if (get(data, "najmUmowa") === "Nie dotyczy" || isGG(get(data, "najmWypowiedzenie"))) {
      result.mod7BClosed = true;
    }
  }

  if (moduleKey === "mod8Inne") {
    const bramkiND = get(data, "bramkiRodzaj") === "Nie dotyczy";
    const domenaND = get(data, "domenaRodzaj") === "Nie dotyczy";
    if ((bramkiND || isGG(get(data, "bramkiStatus"))) && (domenaND || isGG(get(data, "domenaStatus")))) {
      result.mod8Closed = true;
    }
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
}
