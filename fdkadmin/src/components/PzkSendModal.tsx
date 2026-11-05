"use client";

import { useState } from "react";

export interface PzkSendCase {
  id: string;
  name: string;
  emailInitialSent: boolean;
}

interface BulkResult {
  sent: { id: string; name: string; recipientCount: number }[];
  skipped: { id: string; name: string; reason: string }[];
  failed: { id: string; name: string; error: string }[];
}

interface Props {
  /** Single case → uses /api/pzk/[id]/send; multiple → /api/pzk/send-bulk */
  cases: PzkSendCase[];
  onClose: () => void;
  onSent: () => void;
}

export default function PzkSendModal({ cases, onClose, onSent }: Props) {
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgentLabel, setUrgentLabel] = useState("1h");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [details, setDetails] = useState<BulkResult | null>(null);
  const [done, setDone] = useState(false);

  const isBulk = cases.length > 1;
  const singleCase = cases.length === 1 ? cases[0] : null;

  async function handleSend() {
    setSending(true);
    setResult(null);
    setDetails(null);
    try {
      if (singleCase) {
        // Single case — existing endpoint
        const res = await fetch(`/api/pzk/${singleCase.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isUrgent, urgentLabel: isUrgent ? urgentLabel : null }),
        });
        const data = await res.json();
        if (res.ok) {
          setResult(`Wysłano do ${data.recipientCount} grup odbiorców.`);
          setDone(true);
          onSent();
        } else {
          setResult(data.error || "Błąd wysyłania");
        }
      } else {
        // Bulk send
        const res = await fetch("/api/pzk/send-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: cases.map((c) => c.id),
            isUrgent,
            urgentLabel: isUrgent ? urgentLabel : null,
          }),
        });
        const data: BulkResult = await res.json();
        if (res.ok) {
          const parts: string[] = [];
          if (data.sent.length) parts.push(`Wysłano: ${data.sent.length}`);
          if (data.skipped.length) parts.push(`Pominięto: ${data.skipped.length}`);
          if (data.failed.length) parts.push(`Błędy: ${data.failed.length}`);
          setResult(parts.join(", "));
          setDetails(data);
          setDone(true);
          onSent();
        } else {
          setResult((data as unknown as { error: string }).error || "Błąd wysyłania");
        }
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-gray-900 mb-4">
          {isBulk ? `Wyślij sprawy (${cases.length})` : "Wyślij sprawę"}
        </h2>

        {/* Case list (bulk) */}
        {isBulk && !done && (
          <div className="mb-4 max-h-40 overflow-y-auto border rounded p-2 text-sm space-y-1">
            {cases.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-gray-800">{c.name}</span>
                {c.emailInitialSent && (
                  <span className="text-xs text-orange-600 ml-2 whitespace-nowrap">ponowna wysyłka</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Single case resend notice */}
        {singleCase?.emailInitialSent && !done && (
          <p className="text-xs text-orange-600 mb-3">To jest ponowna wysyłka powiadomienia.</p>
        )}

        {/* Urgent toggle */}
        {!done && (
          <div className="space-y-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
              <span className="text-sm font-medium">PILNE</span>
            </label>
            {isUrgent && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                <select
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={urgentLabel}
                  onChange={(e) => setUrgentLabel(e.target.value)}
                >
                  <option value="1h">1 godzina</option>
                  <option value="2h">2 godziny</option>
                  <option value="3h">3 godziny</option>
                  <option value="1 dzień">1 dzień</option>
                </select>
              </div>
            )}
            {!isUrgent && <p className="text-xs text-gray-500">Deadline: 2 dni robocze (domyślny)</p>}
          </div>
        )}

        {/* Result message */}
        {result && (
          <p className={`text-sm mb-3 ${done ? "text-green-700 font-medium" : "text-red-600"}`}>{result}</p>
        )}

        {/* Bulk result details */}
        {details && (details.skipped.length > 0 || details.failed.length > 0) && (
          <Details details={details} />
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {!done && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? "Wysyłanie..." : isBulk ? `Wyślij (${cases.length})` : "Wyślij powiadomienia"}
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm text-gray-600 hover:text-gray-900 ${done ? "flex-1 bg-gray-100 rounded-lg" : ""}`}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

function Details({ details }: { details: BulkResult }) {
  const [open, setOpen] = useState(false);
  const items = [
    ...details.skipped.map((s) => ({ name: s.name, info: `Pominięto: ${s.reason}` })),
    ...details.failed.map((f) => ({ name: f.name, info: `Błąd: ${f.error}` })),
  ];
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)} className="text-xs text-blue-600 hover:underline">
        {open ? "Zwiń szczegóły" : `Pokaż szczegóły (${items.length})`}
      </button>
      {open && (
        <div className="mt-1 border rounded p-2 text-xs space-y-1 max-h-32 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="text-gray-600">
              <span className="font-medium text-gray-800">{item.name}</span> — {item.info}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
