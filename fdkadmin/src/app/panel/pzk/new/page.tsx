"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PZK_CLIENT_TYPE_LABELS, PzkClientType } from "@/lib/pzk-types";

// PZK (non-Tutlo) only shows non-Tutlo client types
const CLIENT_TYPES: PzkClientType[] = [
  "STANDARD_KADRY",
  "OBCOKRAJOWIEC_HR",
  "OBCOKRAJOWIEC_HR_ENG",
];

export default function NewPzkPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    lastName: "",
    firstNames: "",
    benefEmail: "",
    clientType: "STANDARD_KADRY" as PzkClientType,
    responsibleWorker: "",
    cooperationEndsAt: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.lastName.trim() || !form.firstNames.trim()) {
      setError("Nazwisko i imiona są wymagane.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/pzk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, panel: "PZK" }),
      });
      if (!res.ok) {
        let msg = "Nie udało się utworzyć sprawy. Spróbuj ponownie.";
        try { const data = await res.json(); if (data.error) msg = data.error; } catch {}
        setError(msg);
        return;
      }
      const created = await res.json();
      router.push(`/panel/pzk/${created.id}`);
    } catch {
      setError("Błąd połączenia z serwerem. Spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nowe wypowiedzenie — PZK</h1>
        <p className="text-sm text-gray-500 mt-0.5">Klienci nie-Tutlo</p>
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Kowalski"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imiona *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.firstNames}
            onChange={(e) => set("firstNames", e.target.value)}
            placeholder="Jan Piotr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail beneficjenta</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.benefEmail}
            onChange={(e) => set("benefEmail", e.target.value)}
            placeholder="jan.kowalski@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rodzaj klienta *</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.clientType}
            onChange={(e) => set("clientType", e.target.value)}
          >
            {CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>{PZK_CLIENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pracownik odpowiedzialny</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.responsibleWorker}
            onChange={(e) => set("responsibleWorker", e.target.value)}
            placeholder="np. Paulina Boruń"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Współpraca do</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.cooperationEndsAt}
            onChange={(e) => set("cooperationEndsAt", e.target.value)}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Zapisywanie..." : "Utwórz sprawę"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
