import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, login: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/auth/workers error:", error);
    return NextResponse.json(
      { error: "Database error", details: String(error) },
      { status: 500 }
    );
  }
}
