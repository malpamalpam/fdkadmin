"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaseCard } from "@/components/CaseCard";
import { StatsBar } from "@/components/StatsBar";

interface CaseData {
  id: string; createdAt: string; channel: string; taker: string; takerId: string | null;
  client: string; topic: string; dept: string; owner: string | null; ownerId: string | null;
  salutation: string; language: string; responseTime: number | null;
  acceptedAt: string | null; acceptedBy: string | null;
  deadline: string | null; deadlineSetAt: string | null; deadlineSetBy: string | null;
  status: string; extended: boolean;
  firstContactAt: string | null; firstContactSentAt: string | null;
  extensionSentAt: string | null; closedAt: string | null; note: string | null;
}

interface SettingsData {
  bccEmail: string;
  signatureTemplate?: string | null;
  timeFormatRelative?: boolean;
}

const DEPT_OPTIONS = [
  { value: "", label: "Wszystkie" },
  ...["Administracja", "B2B", "HR", "Kadry", "Kontakt", "Księgowość", "Opłaty", "Tutlo"]
    .map((label) => {
      const map: Record<string, string> = { Administracja: "ADMINISTRACJA", B2B: "B2B", HR: "HR", Kadry: "KADRY", Kontakt: "KONTAKT", "Księgowość": "KSIEGOWOSC", "Opłaty": "OPLATY", Tutlo: "TUTLO" };
      return { value: map[label], label };
    }),
  { value: "INNY", label: "Inny" },
];

export default function PanelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openCases, setOpenCases] = useState<CaseData[]>([]);
  const [closedCases, setClosedCases] = useState<CaseData[]>([]);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [settings, setSettings] = useState<SettingsData>({ bccEmail: "administracja@firmadlakazdego.pl" });
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const [filterDept, setFilterDept] = useState(searchParams.get("dept") || "");
  const [filterClient, setFilterClient] = useState(searchParams.get("client") || "");

  // Update URL when filters change
  function updateFilters(dept: string, client: string) {
    setFilterDept(dept);
    setFilterClient(client);
    const params = new URLSearchParams();
    if (dept) params.set("dept", dept);
    if (client) params.set("client", client);
    const qs = params.toString();
    router.replace(`/panel${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const fetchCases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("dept", filterDept);
      if (filterClient) params.set("client", filterClient);
      const qs = params.toString();

      const [openRes, closedRes, settingsRes] = await Promise.all([
        fetch(`/api/cases${qs ? `?${qs}` : ""}`),
        fetch(`/api/cases?closed=true${qs ? `&${qs.replace("?", "")}` : ""}`),
        fetch("/api/settings"),
      ]);

      if (openRes.ok) setOpenCases(await openRes.json());
      if (closedRes.ok) setClosedCases(await closedRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings({
          bccEmail: s.bccEmail || "administracja@firmadlakazdego.pl",
          signatureTemplate: s.signatureTemplate,
          timeFormatRelative: s.timeFormatRelative,
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterClient]);

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 30000);
    return () => clearInterval(interval);
  }, [fetchCases]);

  useEffect(() => {
    const overdue = openCases.filter((c) => c.deadline && new Date(c.deadline) < new Date()).length;
    const pending = openCases.filter((c) => c.status === "ZGLOSZONA" || c.status === "OCZEKUJE_NA_DEADLINE").length;
    const alerts = overdue + pending;
    document.title = alerts > 0 ? `(${alerts}⚠) FDK Rejestr` : "FDK Rejestr zgłoszeń";
  }, [openCases]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-gray-500">Ładowanie...</div></div>;
  }

  // Sort: ZGLOSZONA first, then PRZYJETA, then by deadline
  const sortedOpen = [...openCases].sort((a, b) => {
    const priority = (s: string) => s === "ZGLOSZONA" || s === "OCZEKUJE_NA_DEADLINE" ? 0 : s === "PRZYJETA" || s === "NOWE" ? 1 : 2;
    const ap = priority(a.status), bp = priority(b.status);
    if (ap !== bp) return ap - bp;
    if (!a.deadline) return -1;
    if (!b.deadline) return 1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Unique clients for autocomplete
  const allClients = Array.from(new Set([...openCases, ...closedCases].map((c) => c.client))).sort((a, b) => a.localeCompare(b, "pl"));

  return (
    <div>
      <StatsBar openCases={openCases} closedCases={closedCases} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white rounded-lg border p-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Dział</label>
          <select value={filterDept} onChange={(e) => updateFilters(e.target.value, filterClient)} className="border rounded px-2 py-1 text-sm">
            {DEPT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">Beneficjent</label>
          <input type="text" value={filterClient} onChange={(e) => updateFilters(filterDept, e.target.value)} placeholder="Szukaj beneficjenta..." list="clients-list" className="w-full border rounded px-2 py-1 text-sm" />
          <datalist id="clients-list">
            {allClients.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        {(filterDept || filterClient) && (
          <button onClick={() => updateFilters("", "")} className="self-end px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Wyczyść filtry</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("open")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "open" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}>
          Otwarte ({openCases.length})
        </button>
        <button onClick={() => setTab("closed")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "closed" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}>
          Zamknięte ({closedCases.length})
        </button>
      </div>

      {tab === "open" && (
        <div className="space-y-3">
          {sortedOpen.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Brak otwartych spraw</div>
          ) : (
            sortedOpen.map((c) => <CaseCard key={c.id} caseData={c} bccEmail={settings.bccEmail} settings={settings} onRefresh={fetchCases} />)
          )}
        </div>
      )}

      {tab === "closed" && (
        <div className="space-y-3">
          {closedCases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Brak zamkniętych spraw w ostatnich 30 dniach</div>
          ) : (
            closedCases.map((c) => (
              <CaseCard key={c.id} caseData={c} bccEmail={settings.bccEmail} settings={settings} onRefresh={fetchCases} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
