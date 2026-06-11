"use client";

import { useState, useEffect } from "react";
import { getSortedDepartments } from "@/lib/constants";

const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry", ADMINISTRACJA: "Administracja", KONTAKT: "Kontakt", HR: "HR",
  KSIEGOWOSC: "Księgowość", B2B: "B2B", OPLATY: "Opłaty", TUTLO: "Tutlo", INNY: "Inny",
};

interface Setting {
  teamsWebhookUrl: string | null;
  workflowsWebhookUrl: string | null;
  bccEmail: string;
  signatureTemplate: string | null;
  timeFormatRelative: boolean;
}

interface UserRecord {
  id: string; login: string; fullName: string; email: string | null; teamsUpn: string | null;
  dept: string | null; role: string; gender: string; position: string | null; active: boolean;
}

interface DeptConfig { id: string; code: string; name: string; email: string | null; emails: string[]; }

const SORTED_DEPTS = getSortedDepartments();
const DEPARTMENTS = [{ value: "", label: "— brak —" }, ...SORTED_DEPTS];
const ROLES = [
  { value: "EMPLOYEE", label: "Pracownik" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMIN", label: "Admin" },
];

const DEFAULT_SIG = `{regards}

{fullName}
{position}

Fundacja Firma Dla Każdego

ul. Lwowska 17/4
00-660 Warszawa
NIP: 5252625624

www.firmadlakazdego.pl`;

export default function UstawieniaPage() {
  const [settings, setSettings] = useState<Setting>({
    teamsWebhookUrl: "", workflowsWebhookUrl: "", bccEmail: "administracja@firmadlakazdego.pl",
    signatureTemplate: null, timeFormatRelative: true,
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [deptConfigs, setDeptConfigs] = useState<DeptConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ login: "", fullName: "", password: "", email: "", teamsUpn: "", dept: "", role: "EMPLOYEE", gender: "K", position: "" });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<UserRecord>>({});
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/settings/users").then((r) => r.json()),
      fetch("/api/settings/departments").then((r) => r.json()),
    ]).then(([s, u, d]) => {
      setSettings(s);
      setUsers((Array.isArray(u) ? u : []).sort((a: UserRecord, b: UserRecord) => a.fullName.localeCompare(b.fullName, "pl")));
      setDeptConfigs(Array.isArray(d) ? d : []);
    });
  }, []);

  async function saveSettings() {
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      setMessage(res.ok ? "Zapisano ustawienia" : "Błąd zapisu");
    } catch { setMessage("Błąd połączenia"); }
    finally { setSaving(false); }
  }

  async function saveDeptEmails(code: string, emails: string[]) {
    await fetch("/api/settings/departments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, emails }) });
    setDeptConfigs(deptConfigs.map((d) => d.code === code ? { ...d, emails } : d));
  }

  async function addUser() {
    if (!newUser.login.trim() || !newUser.fullName.trim() || !newUser.password) return;
    const res = await fetch("/api/settings/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) });
    if (res.ok) {
      const created = await res.json();
      setUsers([...users, created].sort((a, b) => a.fullName.localeCompare(b.fullName, "pl")));
      setNewUser({ login: "", fullName: "", password: "", email: "", teamsUpn: "", dept: "", role: "EMPLOYEE", gender: "K", position: "" });
      setShowNewUser(false);
    } else { const data = await res.json(); alert(data.error || "Błąd"); }
  }

  async function updateUser(id: string) {
    const res = await fetch("/api/settings/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...editData }) });
    if (res.ok) { const updated = await res.json(); setUsers(users.map((u) => (u.id === id ? { ...u, ...updated } : u))); setEditingUser(null); }
    else { const data = await res.json(); alert(data.error || "Błąd"); }
  }

  async function deactivateUser(id: string) {
    if (!confirm("Czy na pewno chcesz dezaktywować tego użytkownika?")) return;
    const res = await fetch("/api/settings/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setUsers(users.filter((u) => u.id !== id));
  }

  async function resetPassword() {
    if (!resetUserId || !newPassword) return;
    const res = await fetch("/api/settings/users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: resetUserId, newPassword }) });
    if (res.ok) { alert("Hasło zostało zmienione"); setResetUserId(null); setNewPassword(""); }
    else { const data = await res.json(); alert(data.error || "Błąd"); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">Ustawienia</h1>

      {/* Teams / Webhooks */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Powiadomienia Teams</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teams Incoming Webhook URL (klasyczny)</label>
          <input type="url" value={settings.teamsWebhookUrl || ""} onChange={(e) => setSettings({ ...settings, teamsWebhookUrl: e.target.value })} placeholder="https://outlook.office.com/webhook/..." className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Workflows (Adaptive Cards + @wzmianki)</label>
          <input type="url" value={settings.workflowsWebhookUrl || ""} onChange={(e) => setSettings({ ...settings, workflowsWebhookUrl: e.target.value })} placeholder="https://prod-xx.westeurope.logic.azure.com/workflows/..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Power Automate Workflow webhook — umożliwia @wzmianki imienne</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adres UDW (BCC) dla kontaktu wstępnego</label>
          <input type="email" value={settings.bccEmail} onChange={(e) => setSettings({ ...settings, bccEmail: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      {/* Signature + Time format */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Wiadomości</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format czasu w wiadomościach</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" checked={settings.timeFormatRelative} onChange={() => setSettings({ ...settings, timeFormatRelative: true })} />
              Względny (domyślny) — „w ciągu około X godzin"
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" checked={!settings.timeFormatRelative} onChange={() => setSettings({ ...settings, timeFormatRelative: false })} />
              Konkretna godzina — „do godziny 14:30"
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Szablon stopki ({"{fullName}"}, {"{position}"}, {"{regards}"})
          </label>
          <textarea value={settings.signatureTemplate || DEFAULT_SIG} onChange={(e) => setSettings({ ...settings, signatureTemplate: e.target.value })} rows={10} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
        </div>
        <button onClick={saveSettings} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Zapisywanie..." : "Zapisz ustawienia"}
        </button>
        {message && <p className="text-sm text-green-600">{message}</p>}
      </section>

      {/* Department emails */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Skrzynki działowe</h2>
        <p className="text-xs text-gray-500">Każdy dział może mieć wiele adresów e-mail. Wpisz adres i naciśnij Enter.</p>
        <div className="space-y-3">
          {SORTED_DEPTS.map((d) => {
            const cfg = deptConfigs.find((c) => c.code === d.value);
            const emails = cfg?.emails?.length ? cfg.emails : (cfg?.email ? [cfg.email] : []);
            return (
              <DeptEmailsEditor key={d.value} label={d.label} code={d.value} emails={emails} onSave={(e) => saveDeptEmails(d.value, e)} />
            );
          })}
        </div>
      </section>

      {/* Users */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Użytkownicy</h2>
          <button onClick={() => setShowNewUser(!showNewUser)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700">+ Nowy użytkownik</button>
        </div>

        {showNewUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Nowy użytkownik</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500">Login *</label><input type="text" value={newUser.login} onChange={(e) => setNewUser({ ...newUser, login: e.target.value })} placeholder="np. jan.kowalski" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Imię i nazwisko *</label><input type="text" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} placeholder="Jan Kowalski" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Hasło *</label><input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min. 6 znaków" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="text-xs text-gray-500">E-mail firmowy</label><input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="jan.kowalski@firmadlakazdego.pl" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Teams UPN (@wzmianki)</label><input type="text" value={newUser.teamsUpn} onChange={(e) => setNewUser({ ...newUser, teamsUpn: e.target.value })} placeholder="jan.kowalski@firmadlakazdego.pl" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Dział</label><select value={newUser.dept} onChange={(e) => setNewUser({ ...newUser, dept: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">{DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
              <div><label className="text-xs text-gray-500">Rola</label><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              <div><label className="text-xs text-gray-500">Płeć</label><select value={newUser.gender} onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm"><option value="K">Kobieta</option><option value="M">Mężczyzna</option></select></div>
              <div className="sm:col-span-2"><label className="text-xs text-gray-500">Stanowisko</label><input type="text" value={newUser.position} onChange={(e) => setNewUser({ ...newUser, position: e.target.value })} placeholder="np. Specjalista ds. kadr" className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={addUser} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">Dodaj</button>
              <button onClick={() => setShowNewUser(false)} className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">Anuluj</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {users.filter((u) => u.active).map((u) => (
            <div key={u.id} className="bg-gray-50 rounded-lg px-4 py-3">
              {editingUser === u.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><label className="text-xs text-gray-500">Imię i nazwisko</label><input type="text" value={editData.fullName ?? u.fullName} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-500">E-mail</label><input type="email" value={editData.email ?? u.email ?? ""} onChange={(e) => setEditData({ ...editData, email: e.target.value || null })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-500">Teams UPN</label><input type="text" value={editData.teamsUpn ?? u.teamsUpn ?? ""} onChange={(e) => setEditData({ ...editData, teamsUpn: e.target.value || null })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-500">Dział</label><select value={editData.dept ?? u.dept ?? ""} onChange={(e) => setEditData({ ...editData, dept: e.target.value || null })} className="w-full border rounded px-2 py-1 text-sm">{DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                    <div><label className="text-xs text-gray-500">Rola</label><select value={editData.role ?? u.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                    <div><label className="text-xs text-gray-500">Płeć</label><select value={editData.gender ?? u.gender} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} className="w-full border rounded px-2 py-1 text-sm"><option value="K">Kobieta</option><option value="M">Mężczyzna</option></select></div>
                    <div className="sm:col-span-3"><label className="text-xs text-gray-500">Stanowisko</label><input type="text" value={editData.position ?? u.position ?? ""} onChange={(e) => setEditData({ ...editData, position: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateUser(u.id)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Zapisz</button>
                    <button onClick={() => setEditingUser(null)} className="px-3 py-1 text-sm bg-gray-200 rounded">Anuluj</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-medium">{u.fullName}</span>
                    <span className="text-xs text-gray-500 ml-2">@{u.login}</span>
                    <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${u.role === "ADMIN" ? "bg-red-100 text-red-700" : u.role === "SUPERVISOR" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{u.role}</span>
                    {u.dept && <span className="text-xs text-gray-500 ml-2">{DEPT_LABELS[u.dept] || u.dept}</span>}
                    {u.email && <span className="text-xs text-gray-400 ml-2">{u.email}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingUser(u.id); setEditData({}); }} className="text-blue-600 hover:text-blue-800 text-sm">Edytuj</button>
                    <button onClick={() => { setResetUserId(u.id); setNewPassword(""); }} className="text-orange-600 hover:text-orange-800 text-sm">Reset hasła</button>
                    <button onClick={() => deactivateUser(u.id)} className="text-red-500 hover:text-red-700 text-sm">Dezaktywuj</button>
                  </div>
                </div>
              )}
              {resetUserId === u.id && (
                <div className="mt-2 flex gap-2 items-center">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nowe hasło (min. 6 znaków)" className="border rounded px-2 py-1 text-sm flex-1" />
                  <button onClick={resetPassword} className="px-3 py-1 text-sm bg-orange-600 text-white rounded">Zmień</button>
                  <button onClick={() => setResetUserId(null)} className="px-3 py-1 text-sm bg-gray-200 rounded">Anuluj</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Export */}
      <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Eksport danych</h2>
        <button onClick={() => window.open("/api/cases/export", "_blank")} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900">📥 Eksport CSV</button>
      </section>
    </div>
  );
}

function DeptEmailsEditor({ label, code, emails, onSave }: { label: string; code: string; emails: string[]; onSave: (emails: string[]) => void }) {
  const [list, setList] = useState(emails);
  const [input, setInput] = useState("");

  function addEmail() {
    const trimmed = input.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (list.includes(trimmed)) { setInput(""); return; }
    const updated = [...list, trimmed];
    setList(updated);
    setInput("");
    onSave(updated);
  }

  function removeEmail(email: string) {
    const updated = list.filter((e) => e !== email);
    setList(updated);
    onSave(updated);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-1 min-h-[32px]">
        {list.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">
            {email}
            <button onClick={() => removeEmail(email)} className="text-blue-400 hover:text-red-500 font-bold">×</button>
          </span>
        ))}
        <input type="email" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
          onBlur={addEmail}
          placeholder="dodaj email..."
          className="border rounded px-2 py-1 text-xs min-w-[180px] flex-1" />
      </div>
    </div>
  );
}
