"use client";

import { useState, useEffect } from "react";

interface Setting {
  teamsWebhookUrl: string | null;
  bccEmail: string;
}

interface Worker {
  id: string;
  name: string;
  active: boolean;
}

export default function UstawieniaPage() {
  const [settings, setSettings] = useState<Setting>({
    teamsWebhookUrl: "",
    bccEmail: "administracja@firmadlakazdego.pl",
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/settings/workers").then((r) => r.json()),
    ]).then(([s, w]) => {
      setSettings(s);
      setWorkers(Array.isArray(w) ? w : []);
    });
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setMessage("Zapisano ustawienia");
      else setMessage("Błąd zapisu");
    } catch {
      setMessage("Błąd połączenia");
    } finally {
      setSaving(false);
    }
  }

  async function addWorker() {
    if (!newWorkerName.trim()) return;
    const res = await fetch("/api/settings/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newWorkerName.trim() }),
    });
    if (res.ok) {
      const worker = await res.json();
      setWorkers([...workers, worker]);
      setNewWorkerName("");
    } else {
      const data = await res.json();
      alert(data.error || "Błąd");
    }
  }

  async function removeWorker(id: string) {
    if (!confirm("Czy na pewno chcesz dezaktywować tego pracownika?")) return;
    const res = await fetch("/api/settings/workers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setWorkers(workers.filter((w) => w.id !== id));
    }
  }

  function handleExport() {
    window.open("/api/cases/export", "_blank");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">Ustawienia</h1>

      {/* Teams Webhook */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Powiadomienia Teams</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teams Incoming Webhook URL
          </label>
          <input
            type="url"
            value={settings.teamsWebhookUrl || ""}
            onChange={(e) =>
              setSettings({ ...settings, teamsWebhookUrl: e.target.value })
            }
            placeholder="https://outlook.office.com/webhook/..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adres UDW (BCC) dla kontaktu wstępnego
          </label>
          <input
            type="email"
            value={settings.bccEmail}
            onChange={(e) =>
              setSettings({ ...settings, bccEmail: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : "Zapisz ustawienia"}
        </button>
        {message && (
          <p className="text-sm text-green-600">{message}</p>
        )}
      </section>

      {/* Workers */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Pracownicy</h2>
        <div className="space-y-2">
          {workers
            .filter((w) => w.active)
            .map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <span>{w.name}</span>
                <button
                  onClick={() => removeWorker(w.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Usuń
                </button>
              </div>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newWorkerName}
            onChange={(e) => setNewWorkerName(e.target.value)}
            placeholder="Imię nowego pracownika"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && addWorker()}
          />
          <button
            onClick={addWorker}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
          >
            Dodaj
          </button>
        </div>
      </section>

      {/* Export */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Eksport danych</h2>
        <p className="text-sm text-gray-600">
          Pobierz plik CSV ze wszystkimi zgłoszeniami. Plik jest kompatybilny z
          Microsoft Excel (UTF-8, separator &quot;;&quot;).
        </p>
        <button
          onClick={handleExport}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900"
        >
          📥 Eksport CSV
        </button>
      </section>
    </div>
  );
}
