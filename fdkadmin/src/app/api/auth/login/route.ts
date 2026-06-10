import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { password, worker } = await request.json();

  if (password !== process.env.TEAM_PASSWORD) {
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }

  // Verify worker exists
  const workerRecord = await prisma.worker.findFirst({
    where: { name: worker, active: true },
  });

  if (!workerRecord) {
    return NextResponse.json({ error: "Nieprawidłowy pracownik" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("fdk_session", "valid", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  response.cookies.set("fdk_worker", worker, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
