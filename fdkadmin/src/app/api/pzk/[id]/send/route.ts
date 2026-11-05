import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { sendPzkCase } from "@/lib/pzk-send";

// POST /api/pzk/[id]/send
// Body: { isUrgent: boolean, urgentLabel?: "1h"|"2h"|"3h"|"1 dzień" }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN, SUPERVISOR, or ADMINISTRACJA/TUTLO employees can send
  const allDepts = [session.dept, ...(session.extraDepts || [])].filter(Boolean);
  const canSend =
    session.role === "ADMIN" ||
    session.role === "SUPERVISOR" ||
    allDepts.includes("ADMINISTRACJA") ||
    allDepts.includes("TUTLO");
  if (!canSend) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const isUrgent: boolean = body.isUrgent ?? false;
  const urgentLabel: string | null = body.urgentLabel ?? null;

  try {
    const result = await sendPzkCase(id, session.fullName, { isUrgent, urgentLabel });
    return NextResponse.json({ ok: true, recipientCount: result.recipientCount, deadline: result.deadline });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "CASE_CLOSED") return NextResponse.json({ error: "Sprawa zamknięta" }, { status: 400 });
    if (msg === "WITHDRAWN") return NextResponse.json({ error: "Rezygnacja z wypowiedzenia" }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
