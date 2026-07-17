import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { canEditModule } from "@/lib/pzk-types";

// PATCH /api/pzk/[id]/module
// Body: { moduleKey: "mod2Admin" | "mod3Kadry" | ... , data: {...} }

const MODULE_KEYS = ["mod2Admin", "mod3Kadry", "mod4Ksieg", "mod5Legal", "mod6Platnosci", "mod7Umowy", "mod8Inne"] as const;
type ModuleKey = typeof MODULE_KEYS[number];

// Map moduleKey → permission check key (mod2Admin → mod2, etc.)
const MODULE_PERM_KEY: Record<ModuleKey, string> = {
  mod2Admin: "mod2",
  mod3Kadry: "mod3",
  mod4Ksieg: "mod4",
  mod5Legal: "mod5",
  mod6Platnosci: "mod6",
  mod7Umowy: "mod7",
  mod8Inne: "mod8",
};

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
  const moduleData = body.data;

  if (!MODULE_KEYS.includes(moduleKey as ModuleKey)) {
    return NextResponse.json({ error: "Invalid moduleKey" }, { status: 400 });
  }

  // Permission check
  const permKey = MODULE_PERM_KEY[moduleKey];
  if (!canEditModule(session.dept, session.role, permKey)) {
    return NextResponse.json({ error: "Forbidden — brak uprawnień do tego modułu" }, { status: 403 });
  }

  const oldData = (existing as Record<string, unknown>)[moduleKey];
  const updated = await prisma.pzkCase.update({
    where: { id },
    data: { [moduleKey]: moduleData },
  });

  await prisma.pzkHistory.create({
    data: {
      caseId: id,
      changedBy: session.fullName,
      field: moduleKey,
      oldValue: oldData ? JSON.stringify(oldData) : null,
      newValue: JSON.stringify(moduleData),
    },
  });

  return NextResponse.json(updated);
}
