import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { password, worker } = await request.json();

  if (password !== process.env.TEAM_PASSWORD) {
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }

  // Find or create worker
  let workerRecord = await prisma.worker.findFirst({
    where: { name: worker, active: true },
  });

  if (!workerRecord) {
    // Auto-create worker on first login with valid password
    workerRecord = await prisma.worker.upsert({
      where: { name: worker },
      update: { active: true },
      create: { name: worker },
    });
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
