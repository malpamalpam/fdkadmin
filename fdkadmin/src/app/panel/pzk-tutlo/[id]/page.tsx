"use client";

// PZK Tutlo detail page — re-uses the same layout as PZK detail.
// The panel distinction is encoded in the case data (c.panel === "PZK_TUTLO").

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PzkCase, Mod2Admin, Mod3Kadry, Mod4Ksieg, Mod5Legal,
  Mod6Platnosci, Mod7Umowy, Mod8Inne,
  PZK_CLIENT_TYPE_LABELS, getAmountColor, canEditModule, FieldColor, collectBraki,
} from "@/lib/pzk-types";
import { useUser } from "@/lib/user-context";

function ColorDot({ color }: { color: FieldColor }) {
  if (!color) return null;
  const cls = { green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500", gray: "bg-gray-300" }[color];
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls} flex-shrink-0`} />;
}

function getFieldColor(value: string | undefined | null): FieldColor {
  if (!value) return null;
  if (value.startsWith("Nie uzyskano") || value.startsWith("Nie opłacono") || ["Odmowa", "Potwierdzenie - brak"].includes(value)) return "red";
  if (["Oryginał", "Komplet", "Dezaktywowane", "Wysłane", "Zamknięte", "Niepotrzebne", "Podpisana i wysłana",
    "Beneficjent nie posiada PESEL", "Opłacono", "Opłacono - z subkonta", "Opłacono - wpłata zewnętrzna", "Opłacono - gotówka"].includes(value)) return "green";
  if (["Skan", "Do uzupełnienia", "Do wysłania", "Aktywne", "Do wpisania"].includes(value)) return "yellow";
  if (value === "Nie dotyczy") return "gray";
  return null;
}

function DropField({ label, value, options, onChange, disabled }: { label: string; value: string | undefined; options: string[]; onChange: (v: string) => void; disabled?: boolean }) {
  const c = getFieldColor(value);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <ColorDot color={c} />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0">{label}</span>
      {disabled ? <span className="text-sm text-gray-700">{value || "—"}</span> : (
        <select className="text-sm border-0 bg-transparent focus:ring-0 p-0 cursor-pointer text-gray-800" value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">— wybierz —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, disabled, type = "text" }: { label: string; value: string | undefined; onChange: (v: string) => void; disabled?: boolean; type?: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-2.5 flex-shrink-0" />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0">{label}</span>
      {disabled ? <span className="text-sm text-gray-700">{value || "—"}</span> : (
        <input type={type} className="text-sm border-0 bg-transparent focus:ring-0 p-0 flex-1 min-w-0 text-gray-800" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="..." />
      )}
    </div>
  );
}

function AmountField({ label, value, paymentStatus, onChange, disabled }: { label: string; value: string | undefined; paymentStatus?: string; onChange: (v: string) => void; disabled?: boolean }) {
  const c = getAmountColor(value, paymentStatus);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <ColorDot color={c} />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0">{label}</span>
      {disabled ? <span className="text-sm text-gray-700">{value || "—"} zł</span> : (
        <input type="text" className="text-sm border-0 bg-transparent focus:ring-0 p-0 w-24 text-gray-800" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="0" />
      )}
    </div>
  );
}

function ModuleCard({ title, closed, canEdit, onToggleClose, onSave, saving, children }: { title: string; closed: boolean; canEdit: boolean; onToggleClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${closed ? "opacity-75" : ""}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          {closed && <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />}
          <h3 className="font-medium text-sm text-gray-800">{title}</h3>
          {closed && <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Zamknięty</span>}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={onSave} disabled={saving} className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50">{saving ? "Zapisuję..." : "Zapisz"}</button>
            <button onClick={onToggleClose} className={`text-xs px-3 py-1 rounded border ${closed ? "border-gray-300 text-gray-600 hover:bg-gray-100" : "border-green-500 text-green-700 hover:bg-green-50"}`}>{closed ? "Otwórz" : "Zamknij moduł"}</button>
          </div>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

const DOC_STATUS = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano", "Nie dotyczy", "Odmowa"];
const ACCESS_STATUS = ["Aktywne", "Dezaktywowane", "Nie dotyczy"];
const PAYMENT_STATUS = ["Komplet", "Opłacono - z subkonta", "Opłacono - wpłata zewnętrzna", "Opłacono - gotówka", "Nie opłacono: proszę uzupełnić"];
const BRANZE = ["Lektor", "IT", "E-commerce", "Grafik", "Architekt", "Fotograf", "Tłumacz", "Coaching", "Consulting", "inne"];
const PESEL_STATUS = ["Do wpisania", "Komplet", "Do uzupełnienia", "Beneficjent nie posiada PESEL"];
const DANE_KONTAKTOWE_STATUS = ["Do wpisania", "Komplet", "Do uzupełnienia", "Brak adresu zamieszkania", "Brak telefonu"];
const WYP_STATUS = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano"];
const ZWUA_STATUS = ["Wysłane", "Do uzupełnienia"];
const B2B_WYP = ["Wysłane", "Do wysłania", "Niepotrzebne"];
const BRAMKI_RODZAJ = ["PayU", "Stripe", "inne", "Nie dotyczy"];
const BRAMKI_STATUS = ["Aktywne", "Zamknięte", "Potwierdzenie - dostarczone", "Potwierdzenie - brak"];
const DOMENA_RODZAJ = ["Cesja", "Nie dotyczy"];
const DOMENA_STATUS = ["Do uzupełnienia", "Podpisana i wysłana", "Niepotrzebne"];

export default function PzkTutloCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();

  const [c, setC] = useState<PzkCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{ id: string; changedBy: string; changedAt: string; field: string; oldValue: string | null; newValue: string | null }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgentLabel, setUrgentLabel] = useState("1h");
  const [sendSaving, setSendSaving] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const [mod2, setMod2] = useState<Mod2Admin>({});
  const [mod3, setMod3] = useState<Mod3Kadry>({});
  const [mod4, setMod4] = useState<Mod4Ksieg>({});
  const [mod5, setMod5] = useState<Mod5Legal>({});
  const [mod6, setMod6] = useState<Mod6Platnosci>({});
  const [mod7, setMod7] = useState<Mod7Umowy>({});
  const [mod8, setMod8] = useState<Mod8Inne>({});
  const [savingMod, setSavingMod] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [mailModal, setMailModal] = useState(false);
  const [mailText, setMailText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pzk/${id}`);
    if (!res.ok) { router.push("/panel/pzk-tutlo"); return; }
    const data: PzkCase = await res.json();
    setC(data);
    setMod2((data.mod2Admin as Mod2Admin) || {});
    setMod3((data.mod3Kadry as Mod3Kadry) || {});
    setMod4((data.mod4Ksieg as Mod4Ksieg) || {});
    setMod5((data.mod5Legal as Mod5Legal) || {});
    setMod6((data.mod6Platnosci as Mod6Platnosci) || {});
    setMod7((data.mod7Umowy as Mod7Umowy) || {});
    setMod8((data.mod8Inne as Mod8Inne) || {});
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (c?.cooperationEndsAt) setDateValue(c.cooperationEndsAt.substring(0, 10));
  }, [c?.cooperationEndsAt]);

  async function saveModule(moduleKey: string, data: unknown) {
    setSavingMod(moduleKey);
    try {
      const res = await fetch(`/api/pzk/${id}/module`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleKey, data }) });
      if (res.ok) setC(await res.json());
    } finally { setSavingMod(null); }
  }

  async function toggleModuleClosed(flag: string, current: boolean) {
    const res = await fetch(`/api/pzk/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [flag]: !current }) });
    if (res.ok) setC(await res.json());
  }

  async function handleSend() {
    setSendSaving(true); setSendResult(null);
    try {
      const res = await fetch(`/api/pzk/${id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isUrgent, urgentLabel: isUrgent ? urgentLabel : null }) });
      const data = await res.json();
      setSendResult(res.ok ? `Wysłano do ${data.recipientCount} grup odbiorców.` : (data.error || "Błąd"));
      if (res.ok) load();
    } finally { setSendSaving(false); }
  }

  async function loadHistory() {
    const res = await fetch(`/api/pzk/${id}/history`);
    if (res.ok) setHistory(await res.json());
    setShowHistory(true);
  }

  async function handleDateSave() {
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cooperationEndsAt: dateValue || null }),
    });
    if (res.ok) { setC(await res.json()); setEditingDate(false); }
  }

  async function toggleRezygnacja() {
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawnFromNotice: !c!.withdrawnFromNotice }),
    });
    if (res.ok) setC(await res.json());
  }

  async function handleDelete() {
    setDeleteSaving(true);
    const res = await fetch(`/api/pzk/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/panel/pzk-tutlo");
    else setDeleteSaving(false);
  }

  function openMailModal() {
    const collected = collectBraki(c!, user?.dept ?? null, user?.role ?? "EMPLOYEE");
    const brakiStr = collected.length > 0 ? collected.join(", ") : "[uzupełnij braki]";
    const endDate = c!.cooperationEndsAt
      ? new Date(c!.cooperationEndsAt).toLocaleDateString("pl-PL") : "[data]";
    setMailText(
      `Temat: Uzupełnienie braków przed końcem współpracy\n\nDzień dobry,\n\nW związku ze zbliżającym się końcem naszej współpracy (${endDate}), proszę o uzupełnienie braków: ${brakiStr}.\n\nProszę o dosłanie braków w ciągu [UZUPEŁNIJ TERMIN].\n\nW razie wątpliwości zapraszam do kontaktu, dziękuję.`
    );
    setMailModal(true);
  }

  if (loading || !c) return <div className="py-10 text-center text-gray-500">Ładowanie...</div>;

  const fullName = `${c.firstNames} ${c.lastName}`;
  const isAdminOrSupervisor = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const canAdmin = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod2");
  const canKadry = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod3");
  const canKsieg = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod4");
  const canLegal = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod5");
  const canOplaty = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod6");
  const canB2B = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod7");
  const canMod8 = canEditModule(user?.dept ?? null, user?.role ?? "EMPLOYEE", "mod8");

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <button onClick={() => router.push("/panel/pzk-tutlo")} className="text-sm text-purple-600 hover:underline mb-1">← PZK Tutlo</button>
          <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1 items-center">
            <span>{PZK_CLIENT_TYPE_LABELS[c.clientType]}</span>
            {c.benefEmail && <span>{c.benefEmail}</span>}
            {editingDate ? (
              <span className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="border rounded px-2 py-0.5 text-sm text-gray-800"
                />
                <button onClick={handleDateSave} className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">Zapisz</button>
                <button onClick={() => setEditingDate(false)} className="text-xs text-gray-400">Anuluj</button>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                Koniec: <strong>{c.cooperationEndsAt ? new Date(c.cooperationEndsAt).toLocaleDateString("pl-PL") : "—"}</strong>
                {canAdmin && (
                  <button onClick={() => setEditingDate(true)} title="Edytuj datę" className="text-gray-400 hover:text-purple-600 ml-0.5 leading-none">✎</button>
                )}
              </span>
            )}
            {c.withdrawnFromNotice && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Rezygnacja z wypowiedzenia</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex flex-col gap-2 items-end">
          {!c.withdrawnFromNotice && (
            <button
              onClick={() => setSendModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${c.emailInitialSent ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-600 text-white hover:bg-green-700"}`}
            >
              {c.emailInitialSent ? "Ponów wysyłkę" : "Wyślij sprawę"}
            </button>
          )}
          <button onClick={openMailModal} className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg border">
            Mail do beneficjenta
          </button>
          {!c.withdrawnFromNotice && canAdmin && (
            <button onClick={toggleRezygnacja} className="text-xs text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
              Rezygnacja z wypowiedzenia
            </button>
          )}
          {c.withdrawnFromNotice && isAdminOrSupervisor && (
            <button onClick={toggleRezygnacja} className="text-xs text-gray-600 hover:text-gray-900 border px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Anuluj rezygnację
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
          <span>Utworzył/a: <strong>{c.createdByName}</strong></span>
          {c.emailInitialSent && <span className="text-green-700">Pow. wstępne wysłane</span>}
          {c.emailMid15Sent && <span className="text-blue-700">Pow. 15. wysłane</span>}
          {c.emailFinal28Sent && <span className="text-orange-700">Pow. 28. wysłane</span>}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Komplet</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Do uzupełnienia</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Nie uzyskano / Odmowa</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Nie dotyczy</span>
        </div>
      </div>

      <div className="space-y-3">
        <ModuleCard title="1. Beneficjent" closed={c.mod1Closed} canEdit={canAdmin} onToggleClose={() => toggleModuleClosed("mod1Closed", c.mod1Closed)} onSave={() => {}} saving={false}>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex gap-2"><span className="text-gray-400 w-48">Nazwisko i imiona</span><span>{fullName}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-48">E-mail</span><span>{c.benefEmail || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-48">Rodzaj klienta</span><span>{PZK_CLIENT_TYPE_LABELS[c.clientType]}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-48">Pracownik odpowiedzialny</span><span>{c.responsibleWorker || "—"}</span></div>
          </div>
        </ModuleCard>

        <ModuleCard title="2. Dział Administracji" closed={c.mod2Closed} canEdit={canAdmin} onToggleClose={() => toggleModuleClosed("mod2Closed", c.mod2Closed)} onSave={() => saveModule("mod2Admin", mod2)} saving={savingMod === "mod2Admin"}>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">2A</p>
          <TextField label="Skąd informacja" value={mod2.infoSource} onChange={(v) => setMod2(d => ({ ...d, infoSource: v }))} disabled={!canAdmin} />
          <DropField label="Wypowiedzenie" value={mod2.wypowiedzenie} options={WYP_STATUS} onChange={(v) => setMod2(d => ({ ...d, wypowiedzenie: v as never }))} disabled={!canAdmin} />
          <TextField label="Data startu / CRM" value={mod2.dataStartuCRM} onChange={(v) => setMod2(d => ({ ...d, dataStartuCRM: v }))} disabled={!canAdmin} type="date" />
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-2">2B</p>
          <DropField label="PESEL" value={mod2.pesel} options={PESEL_STATUS} onChange={(v) => setMod2(d => ({ ...d, pesel: v as never }))} disabled={!canAdmin} />
          <DropField label="Dane kontaktowe" value={mod2.daneKontaktowe} options={DANE_KONTAKTOWE_STATUS} onChange={(v) => setMod2(d => ({ ...d, daneKontaktowe: v as never }))} disabled={!canAdmin} />
          <DropField label="Branża" value={mod2.branza} options={BRANZE} onChange={(v) => setMod2(d => ({ ...d, branza: v as never }))} disabled={!canAdmin} />
          <DropField label="Umowa" value={mod2.umowa} options={DOC_STATUS} onChange={(v) => setMod2(d => ({ ...d, umowa: v as never }))} disabled={!canAdmin} />
          <DropField label="RODO" value={mod2.rodo} options={DOC_STATUS} onChange={(v) => setMod2(d => ({ ...d, rodo: v as never }))} disabled={!canAdmin} />
          <DropField label="Oświadczenie twórcy" value={mod2.oswiadczenieTworcy} options={DOC_STATUS} onChange={(v) => setMod2(d => ({ ...d, oswiadczenieTworcy: v as never }))} disabled={!canAdmin} />
          <DropField label="KRK" value={mod2.krk} options={DOC_STATUS} onChange={(v) => setMod2(d => ({ ...d, krk: v as never }))} disabled={!canAdmin} />
          <DropField label="Oświadczenie elektr." value={mod2.oswiadczenieElektroniczne} options={DOC_STATUS} onChange={(v) => setMod2(d => ({ ...d, oswiadczenieElektroniczne: v as never }))} disabled={!canAdmin} />
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-2">2C</p>
          <DropField label="Benefit System" value={mod2.benefitSystem} options={ACCESS_STATUS} onChange={(v) => setMod2(d => ({ ...d, benefitSystem: v as never }))} disabled={!canAdmin} />
          <DropField label="Konto mBank" value={mod2.kontoMBank} options={ACCESS_STATUS} onChange={(v) => setMod2(d => ({ ...d, kontoMBank: v as never }))} disabled={!canAdmin} />
          <DropField label="Konto CRM" value={mod2.kontoCRM} options={ACCESS_STATUS} onChange={(v) => setMod2(d => ({ ...d, kontoCRM: v as never }))} disabled={!canAdmin} />
          <AmountField label="Bieżące środki mBank" value={mod2.biezaceSwrodkiMBank} onChange={(v) => setMod2(d => ({ ...d, biezaceSwrodkiMBank: v }))} disabled={!canAdmin} />
          <TextField label="Komentarz (mBank)" value={mod2.biezaceSwrodkiKomentarz} onChange={(v) => setMod2(d => ({ ...d, biezaceSwrodkiKomentarz: v }))} disabled={!canAdmin} />
        </ModuleCard>

        <ModuleCard title="3A. Kadry – sprawy kadrowe" closed={c.mod3AClosed} canEdit={canKadry} onToggleClose={() => toggleModuleClosed("mod3AClosed", c.mod3AClosed)} onSave={() => saveModule("mod3Kadry", mod3)} saving={savingMod === "mod3Kadry"}>
          <TextField label="Braki HR/Kadry – dokumenty" value={mod3.brakiKadryDok} onChange={(v) => setMod3(d => ({ ...d, brakiKadryDok: v }))} disabled={!canKadry} />
          <TextField label="Uzupełnione" value={mod3.brakiKadryDokUzup} onChange={(v) => setMod3(d => ({ ...d, brakiKadryDokUzup: v }))} disabled={!canKadry} />
          <AmountField label="Braki HR/Kadry – płatności" value={mod3.brakiKadryPlatnosci} paymentStatus={mod3.brakiKadryPlatnosciStatus} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosci: v }))} disabled={!canKadry} />
          <TextField label="Opłaty za" value={mod3.brakiKadryPlatnosciOplatyZa} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciOplatyZa: v }))} disabled={!canKadry} />
          <DropField label="Status opłat" value={mod3.brakiKadryPlatnosciStatus} options={PAYMENT_STATUS} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciStatus: v }))} disabled={!canKadry} />
          <TextField label="Legitymacja" value={mod3.legitymacja} onChange={(v) => setMod3(d => ({ ...d, legitymacja: v }))} disabled={!canKadry} />
        </ModuleCard>

        <ModuleCard title="3B. Kadry – ubezpieczenia" closed={c.mod3BClosed} canEdit={canKadry} onToggleClose={() => toggleModuleClosed("mod3BClosed", c.mod3BClosed)} onSave={() => saveModule("mod3Kadry", mod3)} saving={savingMod === "mod3Kadry"}>
          <AmountField label="Braki UZ – płatności" value={mod3.brakiUZPlatnosci} paymentStatus={mod3.brakiUZPlatnosciStatus} onChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosci: v }))} disabled={!canKadry} />
          <TextField label="Opłaty za" value={mod3.brakiUZPlatnosciOplatyZa} onChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosciOplatyZa: v }))} disabled={!canKadry} />
          <DropField label="Status opłat" value={mod3.brakiUZPlatnosciStatus} options={PAYMENT_STATUS} onChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnościStatus: v }))} disabled={!canKadry} />
          <DropField label="ZWUA" value={mod3.zwua} options={ZWUA_STATUS} onChange={(v) => setMod3(d => ({ ...d, zwua: v as never }))} disabled={!canKadry} />
          <TextField label="Data ZWUA" value={mod3.dataZwua} onChange={(v) => setMod3(d => ({ ...d, dataZwua: v }))} disabled={!canKadry} type="date" />
          <TextField label="Komentarz kadrowy" value={mod3.komentarzKadrowy} onChange={(v) => setMod3(d => ({ ...d, komentarzKadrowy: v }))} disabled={!canKadry} />
        </ModuleCard>

        <ModuleCard title="4. Dział Księgowy" closed={c.mod4Closed} canEdit={canKsieg} onToggleClose={() => toggleModuleClosed("mod4Closed", c.mod4Closed)} onSave={() => saveModule("mod4Ksieg", mod4)} saving={savingMod === "mod4Ksieg"}>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">4A</p>
          <TextField label="Braki księgowość – dok." value={mod4.brakiKsiegDok} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegDok: v }))} disabled={!canKsieg} />
          <TextField label="Uzupełnione" value={mod4.brakiKsiegDokUzup} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegDokUzup: v }))} disabled={!canKsieg} />
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-2">4B</p>
          <AmountField label="Braki księgowość – płat." value={mod4.brakiKsiegPlatnosci} paymentStatus={mod4.brakiKsiegPlatnosciStatus} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosci: v }))} disabled={!canKsieg} />
          <TextField label="Opłaty za" value={mod4.brakiKsiegPlatnosciOplatyZa} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosciOplatyZa: v }))} disabled={!canKsieg} />
          <DropField label="Status opłat" value={mod4.brakiKsiegPlatnosciStatus} options={PAYMENT_STATUS} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosciStatus: v }))} disabled={!canKsieg} />
          <TextField label="Komentarz księgowy" value={mod4.komentarzKsieg} onChange={(v) => setMod4(d => ({ ...d, komentarzKsieg: v }))} disabled={!canKsieg} />
        </ModuleCard>

        <ModuleCard title="5. Dział Legalizacji" closed={c.mod5Closed} canEdit={canLegal} onToggleClose={() => toggleModuleClosed("mod5Closed", c.mod5Closed)} onSave={() => saveModule("mod5Legal", mod5)} saving={savingMod === "mod5Legal"}>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">5A</p>
          <TextField label="Braki legalizacja – dok." value={mod5.brakiLegalDok} onChange={(v) => setMod5(d => ({ ...d, brakiLegalDok: v }))} disabled={!canLegal} />
          <TextField label="Uzupełnione" value={mod5.brakiLegalDokUzup} onChange={(v) => setMod5(d => ({ ...d, brakiLegalDokUzup: v }))} disabled={!canLegal} />
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-2">5B</p>
          <AmountField label="Braki legalizacja – płat." value={mod5.brakiLegalPlatnosci} paymentStatus={mod5.brakiLegalPlatnosciStatus} onChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosci: v }))} disabled={!canLegal} />
          <TextField label="Opłaty za" value={mod5.brakiLegalPlatnosciOplatyZa} onChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosciOplatyZa: v }))} disabled={!canLegal} />
          <DropField label="Status opłat" value={mod5.brakiLegalPlatnosciStatus} options={PAYMENT_STATUS} onChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosciStatus: v }))} disabled={!canLegal} />
          <TextField label="Komentarz legalizacyjny" value={mod5.komentarzLegal} onChange={(v) => setMod5(d => ({ ...d, komentarzLegal: v }))} disabled={!canLegal} />
        </ModuleCard>

        <ModuleCard title="6. Płatności" closed={c.mod6Closed} canEdit={canOplaty} onToggleClose={() => toggleModuleClosed("mod6Closed", c.mod6Closed)} onSave={() => saveModule("mod6Platnosci", mod6)} saving={savingMod === "mod6Platnosci"}>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">6A</p>
          <AmountField label="Opłaty za współpracę" value={mod6.oplatyWspolpraca} paymentStatus={mod6.oplatyWspolpracaStatus} onChange={(v) => setMod6(d => ({ ...d, oplatyWspolpraca: v }))} disabled={!canOplaty} />
          <TextField label="Za okres" value={mod6.oplatyWspolpracaZaOkres} onChange={(v) => setMod6(d => ({ ...d, oplatyWspolpracaZaOkres: v }))} disabled={!canOplaty} />
          <DropField label="Status opłat" value={mod6.oplatyWspolpracaStatus} options={PAYMENT_STATUS} onChange={(v) => setMod6(d => ({ ...d, oplatyWspolpracaStatus: v }))} disabled={!canOplaty} />
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-2">6B</p>
          <AmountField label="Opłaty Benefit" value={mod6.oplatyBenefit} paymentStatus={mod6.oplatyBenefitStatus} onChange={(v) => setMod6(d => ({ ...d, oplatyBenefit: v }))} disabled={!canOplaty} />
          <TextField label="Za okres" value={mod6.oplatyBenefitZaOkres} onChange={(v) => setMod6(d => ({ ...d, oplatyBenefitZaOkres: v }))} disabled={!canOplaty} />
          <DropField label="Status opłat" value={mod6.oplatyBenefitStatus} options={[...PAYMENT_STATUS, "Nie dotyczy"]} onChange={(v) => setMod6(d => ({ ...d, oplatyBenefitStatus: v }))} disabled={!canOplaty} />
        </ModuleCard>

        <ModuleCard title="7A. Umowy B2B" closed={c.mod7AClosed} canEdit={canB2B} onToggleClose={() => toggleModuleClosed("mod7AClosed", c.mod7AClosed)} onSave={() => saveModule("mod7Umowy", mod7)} saving={savingMod === "mod7Umowy"}>
          <TextField label="Kontrahent" value={mod7.b2bKontrahent} onChange={(v) => setMod7(d => ({ ...d, b2bKontrahent: v }))} disabled={!canB2B} />
          <TextField label="Data rozpoczęcia" value={mod7.b2bDataRozpoczecia} onChange={(v) => setMod7(d => ({ ...d, b2bDataRozpoczecia: v }))} disabled={!canB2B} type="date" />
          <DropField label="Wypowiedzenie" value={mod7.b2bWypowiedzenie} options={B2B_WYP} onChange={(v) => setMod7(d => ({ ...d, b2bWypowiedzenie: v as never }))} disabled={!canB2B} />
          <TextField label="Data wypowiedzenia" value={mod7.b2bDataWypowiedzenia} onChange={(v) => setMod7(d => ({ ...d, b2bDataWypowiedzenia: v }))} disabled={!canB2B} type="date" />
        </ModuleCard>

        <ModuleCard title="7B. Umowy najmu" closed={c.mod7BClosed} canEdit={canB2B} onToggleClose={() => toggleModuleClosed("mod7BClosed", c.mod7BClosed)} onSave={() => saveModule("mod7Umowy", mod7)} saving={savingMod === "mod7Umowy"}>
          <TextField label="Umowa najmu" value={mod7.najmUmowa} onChange={(v) => setMod7(d => ({ ...d, najmUmowa: v }))} disabled={!canB2B} />
          <TextField label="Data rozpoczęcia" value={mod7.najmDataRozpoczecia} onChange={(v) => setMod7(d => ({ ...d, najmDataRozpoczecia: v }))} disabled={!canB2B} type="date" />
          <DropField label="Wypowiedzenie" value={mod7.najmWypowiedzenie} options={B2B_WYP} onChange={(v) => setMod7(d => ({ ...d, najmWypowiedzenie: v as never }))} disabled={!canB2B} />
          <TextField label="Data wypowiedzenia" value={mod7.najmDataWypowiedzenia} onChange={(v) => setMod7(d => ({ ...d, najmDataWypowiedzenia: v }))} disabled={!canB2B} type="date" />
        </ModuleCard>

        <ModuleCard title="8. Inne" closed={c.mod8Closed} canEdit={canMod8} onToggleClose={() => toggleModuleClosed("mod8Closed", c.mod8Closed)} onSave={() => saveModule("mod8Inne", mod8)} saving={savingMod === "mod8Inne"}>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">8A — Bramki płatności</p>
          <DropField label="Rodzaj" value={mod8.bramkiRodzaj} options={BRAMKI_RODZAJ} onChange={(v) => setMod8(d => ({ ...d, bramkiRodzaj: v as never }))} disabled={!canMod8} />
          <DropField label="Status" value={mod8.bramkiStatus} options={BRAMKI_STATUS} onChange={(v) => setMod8(d => ({ ...d, bramkiStatus: v as never }))} disabled={!canMod8} />
          <p className="text-xs font-semibold text-gray-400 uppercase mt-3 mb-2">8B — Domena/Hosting</p>
          <DropField label="Cesja" value={mod8.domenaRodzaj} options={DOMENA_RODZAJ} onChange={(v) => setMod8(d => ({ ...d, domenaRodzaj: v as never }))} disabled={!canMod8} />
          <DropField label="Status" value={mod8.domenaStatus} options={DOMENA_STATUS} onChange={(v) => setMod8(d => ({ ...d, domenaStatus: v as never }))} disabled={!canMod8} />
        </ModuleCard>
      </div>

      <div className="mt-6">
        <button onClick={showHistory ? () => setShowHistory(false) : loadHistory} className="text-sm text-purple-600 hover:underline">
          {showHistory ? "Ukryj historię" : "Pokaż historię zmian"}
        </button>
        {showHistory && (
          <div className="mt-3 bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">Historia zmian</div>
            {history.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">Brak historii</p> : (
              <div className="divide-y text-sm max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="px-4 py-2 flex gap-3">
                    <span className="text-gray-400 flex-shrink-0 w-36">{new Date(h.changedAt).toLocaleString("pl-PL")}</span>
                    <span className="font-medium text-gray-700 w-28 flex-shrink-0">{h.changedBy}</span>
                    <span className="text-gray-600"><strong>{h.field}</strong>{h.newValue ? `: ${h.newValue}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete button */}
      {isAdminOrSupervisor && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="text-sm text-red-500 hover:text-red-700">
              Usuń sprawę
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-red-600">Na pewno usunąć tę sprawę? Operacja nieodwracalna.</span>
              <button
                onClick={handleDelete}
                disabled={deleteSaving}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSaving ? "Usuwanie..." : "Tak, usuń"}
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-500">Anuluj</button>
            </div>
          )}
        </div>
      )}

      {sendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="font-bold text-gray-900 mb-4">Wyślij sprawę</h2>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
                <span className="text-sm font-medium">PILNE</span>
              </label>
              {isUrgent ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                  <select className="w-full border rounded px-3 py-1.5 text-sm" value={urgentLabel} onChange={(e) => setUrgentLabel(e.target.value)}>
                    <option value="1h">1 godzina</option>
                    <option value="2h">2 godziny</option>
                    <option value="3h">3 godziny</option>
                    <option value="1 dzień">1 dzień</option>
                  </select>
                </div>
              ) : <p className="text-xs text-gray-500">Deadline: 2 dni robocze (domyślny)</p>}
            </div>
            {sendResult && <p className="text-sm mb-3 text-blue-700">{sendResult}</p>}
            <div className="flex gap-2">
              <button onClick={handleSend} disabled={sendSaving} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {sendSaving ? "Wysyłanie..." : "Wyślij powiadomienia"}
              </button>
              <button onClick={() => { setSendModal(false); setSendResult(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Zamknij</button>
            </div>
          </div>
        </div>
      )}

      {/* Mail modal */}
      {mailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="font-bold text-gray-900 mb-1">Mail do beneficjenta</h2>
            <p className="text-xs text-gray-500 mb-3">Treść edytowalna — zaznaczone braki ze statusem żółtym/czerwonym.</p>
            <textarea
              value={mailText}
              onChange={(e) => setMailText(e.target.value)}
              rows={12}
              className="w-full border rounded-lg p-3 text-sm font-mono resize-y"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { navigator.clipboard.writeText(mailText); }}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Kopiuj do schowka
              </button>
              <button onClick={() => setMailModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
