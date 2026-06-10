import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.setting.findUnique({ where: { id: "default" } });

  if (!settings) {
    settings = await prisma.setting.create({
      data: { id: "default" },
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { teamsWebhookUrl, bccEmail } = body;

  const settings = await prisma.setting.upsert({
    where: { id: "default" },
    update: {
      teamsWebhookUrl: teamsWebhookUrl || null,
      bccEmail: bccEmail || "administracja@firmadlakazdego.pl",
    },
    create: {
      id: "default",
      teamsWebhookUrl: teamsWebhookUrl || null,
      bccEmail: bccEmail || "administracja@firmadlakazdego.pl",
    },
  });

  return NextResponse.json(settings);
}
