import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Telefon",
  EMAIL: "E-mail",
  SMS: "SMS",
};

const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry",
  ADMINISTRACJA: "Administracja",
  KONTAKT: "Kontakt",
  HR: "HR",
  HR_ENG: "HR ENG",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

const STATUS_LABELS: Record<string, string> = {
  NOWE: "Nowe",
  KONTAKT_WSTEPNY: "Kontakt wstępny wysłany",
  W_TOKU: "W toku",
  PRZEDLUZONO: "Przedłużono",
  ZAMKNIETE: "Zamknięte",
};

function formatDatePL(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
}

function formatTimePL(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const { authenticated } = verifyAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Data zgłoszenia",
    "Godzina zgłoszenia",
    "Pracownik przyjmujący zgłoszenie",
    "Deadline na kontakt",
    "Nazwisko i imię beneficjenta",
    "W sprawie",
    "Sprawa do Działu",
    "Sprawa do Pracownika",
    "Osoba odpowiadająca za klienta",
    "Status sprawy",
    "Kiedy została udzielona odpowiedź",
    "Komentarz",
  ];

  const rows = cases.map((c) => [
    formatDatePL(c.createdAt),
    formatTimePL(c.createdAt),
    c.taker,
    formatDateTimePL(c.deadline),
    c.client,
    c.topic,
    DEPT_LABELS[c.dept] || c.dept,
    c.owner || "",
    c.owner || "",
    STATUS_LABELS[c.status] || c.status,
    formatDateTimePL(c.closedAt),
    c.note || "",
  ]);

  const csv =
    headers.map(escapeCSV).join(";") +
    "\n" +
    rows.map((row) => row.map(escapeCSV).join(";")).join("\n");

  // BOM for UTF-8 Excel compatibility
  const BOM = "\uFEFF";
  const body = BOM + csv;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rejestr_zgloszen_${formatDatePL(new Date()).replace(/\./g, "-")}.csv"`,
    },
  });
}
