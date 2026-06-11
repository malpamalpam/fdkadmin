"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSortedDepartments } from "@/lib/constants";

const CHANNELS = [
  { value: "PHONE", label: "Telefon" },
  { value: "EMAIL", label: "E-mail" },
  { value: "SMS", label: "SMS" },
];

const SALUTATIONS = [
  { value: "PAN", label: "Pan" },
  { value: "PANI", label: "Pani" },
];

const LANGUAGES = [
  { value: "PL", label: "Polski" },
  { value: "EN", label: "English" },
  { value: "RU", label: "Русский" },
];

const DEPARTMENTS = getSortedDepartments();

interface WorkerOption { id: string; name: string; dept: string | null; }

export default function NowePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  const [channel, setChannel] = useState("PHONE");
  const [client, setClient] = useState("");
  const [topic, setTopic] = useState("");
  const [dept, setDept] = useState("KADRY");
  const [owner, setOwner] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [salutation, setSalutation] = useState("PAN");
  const [language, setLanguage] = useState("PL");

  useEffect(() => {
    fetch("/api/settings/workers")
      .then((res) => res.json())
      .then((data) => {
        const sorted = (Array.isArray(data) ? data : []).sort((a: WorkerOption, b: WorkerOption) =>
          a.name.localeCompare(b.name, "pl")
        );
        setWorkers(sorted);
      })
      .catch(() => {});
  }, []);

  function handleOwnerChange(value: string) {
    if (value === "") { setOwner(""); setOwnerId(""); }
    else {
      const w = workers.find((w) => w.id === value);
      if (w) { setOwner(w.name); setOwnerId(w.id); }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, client, topic, dept, owner: owner || null, ownerId: ownerId || null, salutation, language }),
      });
      if (res.ok) router.push("/panel");
      else { const data = await res.json(); setError(data.error || "Błąd zapisu"); }
    } catch { setError("Błąd połączenia z serwerem"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Zgłoś sprawę</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kanał kontaktu</label>
          <div className="flex gap-2">
            {CHANNELS.map((ch) => (
              <button key={ch.value} type="button" onClick={() => setChannel(ch.value)}
                className={`px-4 py-2 rounded-lg text-sm border ${channel === ch.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}>{ch.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko i imię beneficjenta *</label>
          <input type="text" value={client} onChange={(e) => setClient(e.target.value)} placeholder="np. Kowalski Jan" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma grzecznościowa *</label>
            <div className="flex gap-2">
              {SALUTATIONS.map((s) => (
                <button key={s.value} type="button" onClick={() => setSalutation(s.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${salutation === s.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Język beneficjenta *</label>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button key={l.value} type="button" onClick={() => setLanguage(l.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${language === l.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}>{l.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">W sprawie *</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="np. Problem z umową zlecenie" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sprawa do działu *</label>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pracownik odpowiedzialny</label>
          <select value={ownerId} onChange={(e) => handleOwnerChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">— nieprzypisany —</option>
            {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          Pracownik odpowiedzialny przyjmie zgłoszenie i wybierze czas reakcji (1h/2h/3h). Odliczanie deadline&apos;u rozpocznie się po wysłaniu kontaktu wstępnego.
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "Zapisywanie..." : "Zgłoś sprawę"}
          </button>
          <button type="button" onClick={() => router.push("/panel")} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Anuluj</button>
        </div>
      </form>
    </div>
  );
}
