import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, isAdmin } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Tylko admin może usuwać sprawy" }, { status: 403 });
  }

  const { id } = await params;

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  // Delete history first (FK constraint), then case
  await prisma.$transaction([
    prisma.caseHistory.deleteMany({ where: { caseId: id } }),
    prisma.case.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
