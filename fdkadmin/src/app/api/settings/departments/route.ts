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
  const { code, emails } = body;

  if (!code) {
    return NextResponse.json({ error: "Kod działu jest wymagany" }, { status: 400 });
  }

  // Validate email formats
  const validEmails = (Array.isArray(emails) ? emails : [])
    .map((e: string) => e.trim())
    .filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const dept = await prisma.departmentConfig.upsert({
    where: { code },
    update: { emails: validEmails },
    create: { code, name: code, emails: validEmails },
  });

  return NextResponse.json(dept);
}
