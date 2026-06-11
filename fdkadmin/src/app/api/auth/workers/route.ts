import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, login: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(users);
}
