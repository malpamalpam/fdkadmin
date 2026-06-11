import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  const { login, password } = await request.json();

  if (!login || !password) {
    return NextResponse.json({ error: "Login i hasło są wymagane" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { login: login.toLowerCase() },
  });

  if (!user || !user.active) {
    return NextResponse.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 });
  }

  const token = await signToken({
    userId: user.id,
    login: user.login,
    fullName: user.fullName,
    role: user.role,
    dept: user.dept,
    gender: user.gender,
  });

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      dept: user.dept,
    },
  });

  response.cookies.set("fdk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
