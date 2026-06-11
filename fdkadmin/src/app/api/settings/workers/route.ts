import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { active: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      teamsUpn: true,
      dept: true,
      role: true,
      gender: true,
      position: true,
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.fullName,
      email: u.email,
      dept: u.dept,
      role: u.role,
      gender: u.gender,
      position: u.position,
      active: true,
    }))
  );
}
