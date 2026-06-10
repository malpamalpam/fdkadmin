import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const workers = await prisma.worker.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(workers);
}
