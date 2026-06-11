import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, isAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      login: true,
      fullName: true,
      email: true,
      teamsUpn: true,
      dept: true,
      role: true,
      gender: true,
      position: true,
      active: true,
      createdAt: true,
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const { login, fullName, password, email, teamsUpn, dept, role, gender, position } = body;

  if (!login || !fullName || !password) {
    return NextResponse.json({ error: "Login, imię i nazwisko oraz hasło są wymagane" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { login: login.toLowerCase() },
  });

  if (existing) {
    if (!existing.active) {
      const passwordHash = await bcrypt.hash(password, 12);
      const reactivated = await prisma.user.update({
        where: { login: login.toLowerCase() },
        data: {
          active: true,
          fullName,
          passwordHash,
          email: email || null,
          teamsUpn: teamsUpn || null,
          dept: dept || null,
          role: role || "EMPLOYEE",
          gender: gender || "K",
          position: position || null,
        },
      });
      return NextResponse.json(reactivated);
    }
    return NextResponse.json({ error: "Użytkownik o tym loginie już istnieje" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      login: login.toLowerCase(),
      passwordHash,
      fullName,
      email: email || null,
      teamsUpn: teamsUpn || null,
      dept: dept || null,
      role: role || "EMPLOYEE",
      gender: gender || "K",
      position: position || null,
    },
  });

  return NextResponse.json(user, { status: 201 });
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
  const { id, fullName, email, teamsUpn, dept, role, gender, position } = body;

  if (!id) {
    return NextResponse.json({ error: "ID użytkownika jest wymagane" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (email !== undefined) updateData.email = email || null;
  if (teamsUpn !== undefined) updateData.teamsUpn = teamsUpn || null;
  if (dept !== undefined) updateData.dept = dept || null;
  if (role !== undefined) updateData.role = role;
  if (gender !== undefined) updateData.gender = gender;
  if (position !== undefined) updateData.position = position || null;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await request.json();

  if (id === session.userId) {
    return NextResponse.json({ error: "Nie można dezaktywować samego siebie" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
