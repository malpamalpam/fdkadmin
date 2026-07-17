"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { PZK_CLIENT_TYPE_LABELS, PzkClientType } from "@/lib/pzk-types";

interface PzkListItem {
  id: string;
  createdAt: string;
  panel: string;
  lastName: string;
  firstNames: string;
  benefEmail: string | null;
  clientType: PzkClientType;
  responsibleWorker: string | null;
  cooperationEndsAt: string | null;
  withdrawnFromNotice: boolean;
  createdByName: string;
  emailInitialSent: boolean;
  mod1Closed: boolean; mod2Closed: boolean; mod3AClosed: boolean; mod3BClosed: boolean;
  mod4Closed: boolean; mod5Closed: boolean; mod6Closed: boolean; mod7AClosed: boolean;
  mod7BClosed: boolean; mod8Closed: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function closedCount(item: PzkListItem): number {
  return [item.mod1Closed, item.mod2Closed, item.mod3AClosed, item.mod3BClosed,
    item.mod4Closed, item.mod5Closed, item.mod6Closed, item.mod7AClosed,
    item.mod7BClosed, item.mod8Closed].filter(Boolean).length;
}

function getMonths(cases: PzkListItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    if (c.cooperationEndsAt) {
      const d = new Date(c.cooperationEndsAt);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  }
  return Array.from(set).sort().reverse();
}

export default function PzkPage() {
  const [cases, setCases] = useState<PzkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [showWithdrawn, setShowWithdrawn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ panel: "PZK" });
      if (monthFilter) params.set("month", monthFilter);
      if (search) params.set("q", search);
      if (showWithdrawn) params.set("withdrawn", "true");
      const res = await fetch(`/api/pzk?${params}`);
      if (res.ok) setCases(await res.json());
    } finally {
      setLoading(false);
    }
  }, [monthFilter, search, showWithdrawn]);

  useEffect(() => { load(); }, [load]);

  // Use all loaded cases to build the month list
  const months = getMonths(cases);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Panel Zamknięcia Klienta</h1>
          <p className="text-sm text-gray-500 mt-0.5">Klienci nie-Tutlo — obsługa: Administracja / Alina</p>
        </div>
        <Link
          href="/panel/pzk/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nowe wypowiedzenie
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white rounded-lg border p-3 items-center">
        <input
          className="border rounded px-3 py-1.5 text-sm w-52"
          placeholder="Szukaj nazwiska..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">Wszystkie miesiące</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
              {m === thisMonth ? " (bieżący)" : ""}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showWithdrawn}
            onChange={(e) => setShowWithdrawn(e.target.checked)}
            className="rounded"
          />
          Pokaż rezygnacje
        </label>
      </div>

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Ładowanie...</div>
      ) : cases.length === 0 ? (
        <div className="text-gray-400 py-10 text-center">Brak spraw</div>
      ) : (
        <div className="space-y-2">
          {cases.map((c) => {
            const closed = closedCount(c);
            const total = 10;
            const allClosed = closed === total;
            return (
              <Link
                key={c.id}
                href={`/panel/pzk/${c.id}`}
                className={`block bg-white border rounded-lg px-4 py-3 hover:border-blue-400 transition-colors ${c.withdrawnFromNotice ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{c.firstNames} {c.lastName}</span>
                      {c.withdrawnFromNotice && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Rezygnacja z wypowiedzenia</span>
                      )}
                      {allClosed && !c.withdrawnFromNotice && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Zamknięta</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-3">
                      <span>{PZK_CLIENT_TYPE_LABELS[c.clientType]}</span>
                      {c.benefEmail && <span>{c.benefEmail}</span>}
                      <span>Koniec: <strong>{formatDate(c.cooperationEndsAt)}</strong></span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {!c.withdrawnFromNotice && (
                      <>
                        <div className="text-sm font-medium text-gray-700">{closed}/{total} modułów</div>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${allClosed ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${(closed / total) * 100}%` }}
                          />
                        </div>
                        {!c.emailInitialSent && (
                          <div className="text-xs text-orange-600 mt-1">Nie wysłano</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
