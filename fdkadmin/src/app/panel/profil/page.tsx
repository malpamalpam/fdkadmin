"use client";

import { useState, useEffect } from "react";

interface UserProfile {
  id: string;
  login: string;
  fullName: string;
  dept: string | null;
  role: string;
  gender: string;
  position: string | null;
  signatureBlock: string | null;
}

const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry",
  ADMINISTRACJA: "Administracja",
  KONTAKT: "Kontakt",
  HR: "HR",
  KSIEGOWOSC: "Księgowość",
  B2B: "B2B",
  OPLATY: "Opłaty",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

export default function ProfilPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [position, setPosition] = useState("");
  const [signatureBlock, setSignatureBlock] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setPosition(data.position || "");
        setSignatureBlock(data.signatureBlock || "");
      })
      .catch(() => {});
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, signatureBlock }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setMessage("Profil zapisany");
      } else {
        const data = await res.json();
        setMessage(data.error || "Błąd zapisu");
      }
    } catch {
      setMessage("Błąd połączenia");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setSaving(true);
    setPasswordMessage("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordMessage("Hasło zmienione");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await res.json();
        setPasswordMessage(data.error || "Błąd");
      }
    } catch {
      setPasswordMessage("Błąd połączenia");
    } finally {
      setSaving(false);
    }
  }

  function getSignaturePreview(): string {
    if (!user) return "";
    if (signatureBlock) return signatureBlock;

    const lines = [
      "Z pozdrowieniami,",
      user.fullName,
    ];
    if (position) lines.push(position);
    lines.push("");
    lines.push("Fundacja Firma Dla Każdego");
    lines.push("ul. Lwowska 17/4, 00-660 Warszawa");
    lines.push("www.firmadlakazdego.pl");
    return lines.join("\n");
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">Mój profil</h1>

      {/* Info */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
        <h2 className="font-semibold text-lg">Dane konta</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Login:</span> {user.login}
          </div>
          <div>
            <span className="text-gray-500">Imię i nazwisko:</span> {user.fullName}
          </div>
          <div>
            <span className="text-gray-500">Rola:</span> {user.role}
          </div>
          <div>
            <span className="text-gray-500">Dział:</span> {user.dept ? DEPT_LABELS[user.dept] || user.dept : "—"}
          </div>
          <div>
            <span className="text-gray-500">Płeć:</span> {user.gender === "K" ? "Kobieta" : "Mężczyzna"}
          </div>
        </div>
      </section>

      {/* Profile Edit */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Stopka i stanowisko</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stanowisko
          </label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="np. Specjalista ds. kadr"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stopka (opcjonalna — jeśli pusta, używana stopka domyślna)
          </label>
          <textarea
            value={signatureBlock}
            onChange={(e) => setSignatureBlock(e.target.value)}
            rows={6}
            placeholder="Pozostaw puste dla domyślnej stopki"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Podgląd stopki
          </label>
          <pre className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-gray-700">
            {getSignaturePreview()}
          </pre>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : "Zapisz profil"}
        </button>
        {message && <p className="text-sm text-green-600">{message}</p>}
      </section>

      {/* Change Password */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Zmiana hasła</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aktualne hasło
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nowe hasło
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 znaków"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={changePassword}
          disabled={saving || !currentPassword || !newPassword}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
        >
          Zmień hasło
        </button>
        {passwordMessage && (
          <p className={`text-sm ${passwordMessage.includes("Błąd") || passwordMessage.includes("Nieprawidłowe") ? "text-red-600" : "text-green-600"}`}>
            {passwordMessage}
          </p>
        )}
      </section>
    </div>
  );
}
