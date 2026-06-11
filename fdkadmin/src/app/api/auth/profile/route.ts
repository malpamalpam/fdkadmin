import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { position, signatureBlock, currentPassword, newPassword } = body;

  const updateData: Record<string, unknown> = {};
  if (position !== undefined) updateData.position = position || null;
  if (signatureBlock !== undefined) updateData.signatureBlock = signatureBlock || null;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Aktualne hasło jest wymagane" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "Użytkownik nie znaleziony" }, { status: 404 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Nieprawidłowe aktualne hasło" }, { status: 401 });
    }
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: {
      id: true,
      login: true,
      fullName: true,
      dept: true,
      role: true,
      gender: true,
      position: true,
      signatureBlock: true,
    },
  });

  return NextResponse.json(updated);
}
