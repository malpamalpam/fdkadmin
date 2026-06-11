"use client";

import { useState, useEffect } from "react";

interface Setting {
  teamsWebhookUrl: string | null;
  bccEmail: string;
}

interface UserRecord {
  id: string;
  login: string;
  fullName: string;
  dept: string | null;
  role: string;
  gender: string;
  position: string | null;
  active: boolean;
}

const DEPARTMENTS = [
  { value: "", label: "— brak —" },
  { value: "KADRY", label: "Kadry" },
  { value: "ADMINISTRACJA", label: "Administracja" },
  { value: "KONTAKT", label: "Kontakt" },
  { value: "HR", label: "HR" },
  { value: "KSIEGOWOSC", label: "Księgowość" },
  { value: "B2B", label: "B2B" },
  { value: "OPLATY", label: "Opłaty" },
  { value: "TUTLO", label: "Tutlo" },
  { value: "INNY", label: "Inny" },
];

const ROLES = [
  { value: "EMPLOYEE", label: "Pracownik" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMIN", label: "Admin" },
];

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

export default function UstawieniaPage() {
  const [settings, setSettings] = useState<Setting>({
    teamsWebhookUrl: "",
    bccEmail: "administracja@firmadlakazdego.pl",
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // New user form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({
    login: "",
    fullName: "",
    password: "",
    dept: "",
    role: "EMPLOYEE",
    gender: "K",
    position: "",
  });

  // Edit user
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<UserRecord>>({});

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/settings/users").then((r) => r.json()),
    ]).then(([s, u]) => {
      setSettings(s);
      setUsers(Array.isArray(u) ? u : []);
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

  async function addUser() {
    if (!newUser.login.trim() || !newUser.fullName.trim() || !newUser.password) return;
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const created = await res.json();
      setUsers([...users, created]);
      setNewUser({ login: "", fullName: "", password: "", dept: "", role: "EMPLOYEE", gender: "K", position: "" });
      setShowNewUser(false);
    } else {
      const data = await res.json();
      alert(data.error || "Błąd");
    }
  }

  async function updateUser(id: string) {
    const res = await fetch("/api/settings/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editData }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      setEditingUser(null);
    } else {
      const data = await res.json();
      alert(data.error || "Błąd");
    }
  }

  async function deactivateUser(id: string) {
    if (!confirm("Czy na pewno chcesz dezaktywować tego użytkownika?")) return;
    const res = await fetch("/api/settings/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "Błąd");
    }
  }

  async function resetPassword() {
    if (!resetUserId || !newPassword) return;
    const res = await fetch("/api/settings/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetUserId, newPassword }),
    });
    if (res.ok) {
      alert("Hasło zostało zmienione");
      setResetUserId(null);
      setNewPassword("");
    } else {
      const data = await res.json();
      alert(data.error || "Błąd");
    }
  }

  function handleExport() {
    window.open("/api/cases/export", "_blank");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
            onChange={(e) => setSettings({ ...settings, teamsWebhookUrl: e.target.value })}
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
            onChange={(e) => setSettings({ ...settings, bccEmail: e.target.value })}
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
        {message && <p className="text-sm text-green-600">{message}</p>}
      </section>

      {/* Users Management */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Użytkownicy</h2>
          <button
            onClick={() => setShowNewUser(!showNewUser)}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
          >
            + Nowy użytkownik
          </button>
        </div>

        {/* New user form */}
        {showNewUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Nowy użytkownik</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Login *</label>
                <input
                  type="text"
                  value={newUser.login}
                  onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                  placeholder="np. jan.kowalski"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Imię i nazwisko *</label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="Jan Kowalski"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Hasło *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min. 6 znaków"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Dział</label>
                <select
                  value={newUser.dept}
                  onChange={(e) => setNewUser({ ...newUser, dept: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Rola</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Płeć</label>
                <select
                  value={newUser.gender}
                  onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="K">Kobieta</option>
                  <option value="M">Mężczyzna</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Stanowisko</label>
                <input
                  type="text"
                  value={newUser.position}
                  onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  placeholder="np. Specjalista ds. kadr"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addUser} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                Dodaj
              </button>
              <button onClick={() => setShowNewUser(false)} className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* Users list */}
        <div className="space-y-2">
          {users.filter((u) => u.active).map((u) => (
            <div key={u.id} className="bg-gray-50 rounded-lg px-4 py-3">
              {editingUser === u.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Imię i nazwisko</label>
                      <input
                        type="text"
                        value={editData.fullName || u.fullName}
                        onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Dział</label>
                      <select
                        value={editData.dept ?? u.dept ?? ""}
                        onChange={(e) => setEditData({ ...editData, dept: e.target.value || null })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Rola</label>
                      <select
                        value={editData.role || u.role}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Płeć</label>
                      <select
                        value={editData.gender || u.gender}
                        onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="K">Kobieta</option>
                        <option value="M">Mężczyzna</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500">Stanowisko</label>
                      <input
                        type="text"
                        value={editData.position ?? u.position ?? ""}
                        onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateUser(u.id)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                      Zapisz
                    </button>
                    <button onClick={() => setEditingUser(null)} className="px-3 py-1 text-sm bg-gray-200 rounded">
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{u.fullName}</span>
                    <span className="text-xs text-gray-500 ml-2">@{u.login}</span>
                    <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                      u.role === "ADMIN" ? "bg-red-100 text-red-700" :
                      u.role === "SUPERVISOR" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {u.role}
                    </span>
                    {u.dept && (
                      <span className="text-xs text-gray-500 ml-2">
                        {DEPT_LABELS[u.dept] || u.dept}
                      </span>
                    )}
                    {u.position && (
                      <span className="text-xs text-gray-400 ml-2">• {u.position}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingUser(u.id); setEditData({}); }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => { setResetUserId(u.id); setNewPassword(""); }}
                      className="text-orange-600 hover:text-orange-800 text-sm"
                    >
                      Reset hasła
                    </button>
                    <button
                      onClick={() => deactivateUser(u.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Dezaktywuj
                    </button>
                  </div>
                </div>
              )}

              {/* Password reset inline */}
              {resetUserId === u.id && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nowe hasło (min. 6 znaków)"
                    className="border rounded px-2 py-1 text-sm flex-1"
                  />
                  <button onClick={resetPassword} className="px-3 py-1 text-sm bg-orange-600 text-white rounded">
                    Zmień
                  </button>
                  <button onClick={() => setResetUserId(null)} className="px-3 py-1 text-sm bg-gray-200 rounded">
                    Anuluj
                  </button>
                </div>
              )}
            </div>
          ))}
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
