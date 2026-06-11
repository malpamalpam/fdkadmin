import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, isAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await prisma.departmentConfig.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function PUT(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const { code, email } = body;

  if (!code) {
    return NextResponse.json({ error: "Kod działu jest wymagany" }, { status: 400 });
  }

  const dept = await prisma.departmentConfig.upsert({
    where: { code },
    update: { email: email || null },
    create: { code, name: code, email: email || null },
  });

  return NextResponse.json(dept);
}
