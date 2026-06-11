import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, canAccessCase } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const caseRecord = await prisma.case.findUnique({ where: { id } });

  if (!caseRecord) {
    return NextResponse.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  }

  if (!canAccessCase(session, caseRecord)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (caseRecord.extensionSentAt) {
    return NextResponse.json({ error: "Wiadomość o przedłużeniu już oznaczona jako wysłana" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      extensionSentAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
