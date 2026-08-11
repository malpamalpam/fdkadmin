"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { PZK_CLIENT_TYPE_LABELS, PzkCase, countFieldColors, closedUnitCount, TOTAL_CLOSE_UNITS } from "@/lib/pzk-types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PzkTutloPage() {
  const [cases, setCases] = useState<PzkCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(() => new Set(["open"]));
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const monthsLoaded = useRef(false);

  // Load available months once (from all cases, unfiltered)
  useEffect(() => {
    if (monthsLoaded.current) return;
    monthsLoaded.current = true;
    fetch("/api/pzk?panel=PZK_TUTLO&months_only=true")
      .then((r) => r.ok ? r.json() : [])
      .then(setAllMonths);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ panel: "PZK_TUTLO" });
      if (monthFilter) params.set("month", monthFilter);
      if (search) params.set("q", search);
      if (statusFilter.size > 0) params.set("status", Array.from(statusFilter).join(","));
      const res = await fetch(`/api/pzk?${params}`);
      if (res.ok) setCases(await res.json());
    } finally {
      setLoading(false);
    }
  }, [monthFilter, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function toggleStatus(key: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Panel Zamknięcia Klienta TUTLO</h1>
          <p className="text-sm text-gray-500 mt-0.5">Klienci Tutlo — obsługa: Przemek</p>
        </div>
        <Link
          href="/panel/pzk-tutlo/new"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
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
          {allMonths.map((m) => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
              {m === thisMonth ? " (bieżący)" : ""}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500 mr-1">Status:</span>
          {([
            ["open", "Otwarte", "bg-blue-100 text-blue-700 border-blue-300"],
            ["closed", "Zamknięte", "bg-gray-100 text-gray-700 border-gray-300"],
            ["withdrawn", "Rezygnacje", "bg-orange-100 text-orange-700 border-orange-300"],
          ] as const).map(([key, label, colors]) => (
            <button
              key={key}
              onClick={() => toggleStatus(key)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                statusFilter.has(key) ? colors : "bg-white text-gray-400 border-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Ładowanie...</div>
      ) : cases.length === 0 ? (
        <div className="text-gray-400 py-10 text-center">Brak spraw</div>
      ) : (
        <div className="space-y-2">
          {cases.map((c) => {
            const closed = closedUnitCount(c);
            const total = TOTAL_CLOSE_UNITS;
            const allClosed = closed === total;
            return (
              <Link
                key={c.id}
                href={`/panel/pzk-tutlo/${c.id}`}
                className={`block bg-white border rounded-lg px-4 py-3 hover:border-purple-400 transition-colors ${c.withdrawnFromNotice || c.caseClosed ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{c.firstNames} {c.lastName}</span>
                      {c.caseClosed && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-medium">Zamknięta</span>
                      )}
                      {c.withdrawnFromNotice && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Rezygnacja</span>
                      )}
                      {allClosed && !c.withdrawnFromNotice && !c.caseClosed && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Komplet</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-3">
                      <span>{PZK_CLIENT_TYPE_LABELS[c.clientType]}</span>
                      {c.benefEmail && <span>{c.benefEmail}</span>}
                      <span>Koniec: <strong>{formatDate(c.cooperationEndsAt)}</strong></span>
                    </div>
                    {!c.withdrawnFromNotice && !c.caseClosed && (() => {
                      const cc = countFieldColors(c);
                      return (
                        <div className="flex gap-2 text-xs mt-0.5">
                          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{cc.green}</span>
                          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{cc.yellow}</span>
                          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{cc.red}</span>
                          {cc.undefined > 0 && <span className="text-gray-400">?{cc.undefined}</span>}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {!c.withdrawnFromNotice && (
                      <>
                        <div className="text-sm font-medium text-gray-700">{closed}/{total} modułów</div>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${allClosed ? "bg-green-500" : "bg-purple-500"}`}
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
