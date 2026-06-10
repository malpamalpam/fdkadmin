"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CHANNELS = [
  { value: "PHONE", label: "Telefon" },
  { value: "EMAIL", label: "E-mail" },
  { value: "SMS", label: "SMS" },
];

const DEPARTMENTS = [
  { value: "KADRY", label: "Kadry" },
  { value: "ADMINISTRACJA", label: "Administracja" },
  { value: "KONTAKT", label: "Kontakt" },
  { value: "HR", label: "HR" },
  { value: "HR_ENG", label: "HR ENG" },
  { value: "TUTLO", label: "Tutlo" },
  { value: "INNY", label: "Inny" },
];

export default function NowePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);

  const [channel, setChannel] = useState("PHONE");
  const [client, setClient] = useState("");
  const [topic, setTopic] = useState("");
  const [dept, setDept] = useState("KADRY");
  const [owner, setOwner] = useState("");
  const [deadlineOffset, setDeadlineOffset] = useState(3); // hours
  const [customDeadline, setCustomDeadline] = useState("");

  useEffect(() => {
    fetch("/api/settings/workers")
      .then((res) => res.json())
      .then((data) => setWorkers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function getDeadlineDate(): Date {
    if (customDeadline) {
      return new Date(customDeadline);
    }
    return new Date(Date.now() + deadlineOffset * 60 * 60 * 1000);
  }

  const deadlinePreview = getDeadlineDate().toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const deadline = getDeadlineDate().toISOString();

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          client,
          topic,
          dept,
          owner: owner || null,
          deadline,
        }),
      });

      if (res.ok) {
        router.push("/panel");
      } else {
        const data = await res.json();
        setError(data.error || "Błąd zapisu");
      }
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Nowe zgłoszenie</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kanał kontaktu
          </label>
          <div className="flex gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                type="button"
                onClick={() => setChannel(ch.value)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  channel === ch.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nazwisko i imię beneficjenta *
          </label>
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="np. Kowalski Jan"
            required
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            W sprawie *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="np. Problem z umową zlecenie"
            required
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sprawa do działu *
          </label>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Owner */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pracownik odpowiedzialny
          </label>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">— nieprzypisany —</option>
            {workers.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deadline *
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {[1, 2, 3].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setDeadlineOffset(h);
                  setCustomDeadline("");
                }}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  deadlineOffset === h && !customDeadline
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                +{h}h
              </button>
            ))}
            <input
              type="datetime-local"
              value={customDeadline}
              onChange={(e) => {
                setCustomDeadline(e.target.value);
                setDeadlineOffset(0);
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <p className="text-sm text-gray-500">
            Deadline: <strong>{deadlinePreview}</strong>
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Zapisywanie..." : "Zapisz zgłoszenie"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/panel")}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
}
