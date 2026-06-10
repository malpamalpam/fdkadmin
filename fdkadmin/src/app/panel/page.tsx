"use client";

import { useState, useEffect, useCallback } from "react";
import { CaseCard } from "@/components/CaseCard";
import { StatsBar } from "@/components/StatsBar";

interface CaseData {
  id: string;
  createdAt: string;
  channel: string;
  taker: string;
  client: string;
  topic: string;
  dept: string;
  owner: string | null;
  deadline: string;
  status: string;
  extended: boolean;
  firstContactAt: string | null;
  closedAt: string | null;
  note: string | null;
}

export default function PanelPage() {
  const [openCases, setOpenCases] = useState<CaseData[]>([]);
  const [closedCases, setClosedCases] = useState<CaseData[]>([]);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [bccEmail, setBccEmail] = useState("administracja@firmadlakazdego.pl");
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    try {
      const [openRes, closedRes, settingsRes] = await Promise.all([
        fetch("/api/cases"),
        fetch("/api/cases?closed=true"),
        fetch("/api/settings"),
      ]);

      if (openRes.ok) setOpenCases(await openRes.json());
      if (closedRes.ok) setClosedCases(await closedRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setBccEmail(settings.bccEmail || "administracja@firmadlakazdego.pl");
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchCases]);

  // Update page title with overdue count
  useEffect(() => {
    const overdue = openCases.filter(
      (c) => new Date(c.deadline) < new Date()
    ).length;
    document.title = overdue > 0
      ? `(${overdue}⚠) FDK Rejestr`
      : "FDK Rejestr zgłoszeń";
  }, [openCases]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div>
      <StatsBar openCases={openCases} closedCases={closedCases} />

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("open")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "open"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border hover:bg-gray-50"
          }`}
        >
          Otwarte ({openCases.length})
        </button>
        <button
          onClick={() => setTab("closed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "closed"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border hover:bg-gray-50"
          }`}
        >
          Zamknięte ({closedCases.length})
        </button>
      </div>

      {/* Cases list */}
      {tab === "open" && (
        <div className="space-y-3">
          {openCases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Brak otwartych spraw
            </div>
          ) : (
            openCases.map((c) => (
              <CaseCard
                key={c.id}
                caseData={c}
                bccEmail={bccEmail}
                onRefresh={fetchCases}
              />
            ))
          )}
        </div>
      )}

      {tab === "closed" && (
        <div className="space-y-3">
          {closedCases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Brak zamkniętych spraw w ostatnich 30 dniach
            </div>
          ) : (
            closedCases.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg shadow-sm border p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{c.client}</h3>
                    <p className="text-sm text-gray-600">{c.topic}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Zamknięte
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Zamknięte:{" "}
                  {c.closedAt &&
                    new Date(c.closedAt).toLocaleString("pl-PL", {
                      timeZone: "Europe/Warsaw",
                    })}
                  {c.closedAt && new Date(c.closedAt) > new Date(c.deadline) && (
                    <span className="text-red-500 ml-2">⚠ po deadline</span>
                  )}
                </div>
                {c.note && (
                  <p className="text-sm bg-gray-50 rounded p-2">{c.note}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
