import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, dept: true },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("PZK workers error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
