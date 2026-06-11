import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { DEPT_LABELS, CHANNEL_LABELS, STATUS_LABELS } from "@/lib/constants";

const SALUTATION_LABELS: Record<string, string> = { PAN: "Pan", PANI: "Pani" };
const LANGUAGE_LABELS: Record<string, string> = { PL: "PL", EN: "EN", RU: "RU" };

function formatDatePL(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
}

function formatTimePL(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" });
}

function formatDateTimePL(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
}

function escapeCSV(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cases = await prisma.case.findMany({ orderBy: { createdAt: "desc" } });

  const headers = [
    "Data zgłoszenia", "Godzina zgłoszenia", "Pracownik zgłaszający",
    "Czas reakcji (h)", "Deadline na kontakt", "Nazwisko i imię beneficjenta",
    "W sprawie", "Sprawa do Działu", "Sprawa do Pracownika",
    "Status sprawy", "Kiedy została udzielona odpowiedź", "Komentarz",
    "Forma", "Język",
  ];

  const rows = cases.map((c) => [
    formatDatePL(c.createdAt),
    formatTimePL(c.createdAt),
    c.taker,
    c.responseTime ? String(c.responseTime) : "",
    formatDateTimePL(c.deadline),
    c.client,
    c.topic,
    DEPT_LABELS[c.dept] || c.dept,
    c.owner || "",
    STATUS_LABELS[c.status] || c.status,
    formatDateTimePL(c.closedAt),
    c.note || "",
    SALUTATION_LABELS[c.salutation] || c.salutation,
    LANGUAGE_LABELS[c.language] || c.language,
  ]);

  const csv = headers.map(escapeCSV).join(";") + "\n" +
    rows.map((row) => row.map(escapeCSV).join(";")).join("\n");

  const BOM = "\uFEFF";
  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rejestr_zgloszen_${formatDatePL(new Date()).replace(/\./g, "-")}.csv"`,
    },
  });
}
