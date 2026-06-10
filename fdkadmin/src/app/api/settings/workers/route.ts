import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workers = await prisma.worker.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(workers);
}

export async function POST(request: NextRequest) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "Imię jest wymagane" }, { status: 400 });
  }

  const existing = await prisma.worker.findUnique({
    where: { name: name.trim() },
  });

  if (existing) {
    if (!existing.active) {
      const reactivated = await prisma.worker.update({
        where: { name: name.trim() },
        data: { active: true },
      });
      return NextResponse.json(reactivated);
    }
    return NextResponse.json({ error: "Pracownik już istnieje" }, { status: 400 });
  }

  const worker = await prisma.worker.create({
    data: { name: name.trim() },
  });

  return NextResponse.json(worker, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  await prisma.worker.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
