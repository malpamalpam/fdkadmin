"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PzkCase, PzkClientType, Mod2Admin, Mod3Kadry, Mod4Ksieg, Mod5Legal,
  Mod6Platnosci, Mod7Umowy, Mod8Inne, ContactEntry,
  PZK_CLIENT_TYPE_LABELS, getFieldColor, getAmountColor, canEditModule, FieldColor,
  collectBraki, countFieldColors, closedUnitCount, TOTAL_CLOSE_UNITS,
} from "@/lib/pzk-types";
import { useUser } from "@/lib/user-context";

// ─── Color badge ──────────────────────────────────────────────────────────────

function ColorDot({ color }: { color: FieldColor }) {
  if (!color) return null;
  const cls = {
    green: "bg-green-500",
    yellow: "bg-yellow-400",
    red: "bg-red-500",
    gray: "bg-gray-300",
  }[color];
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls} flex-shrink-0`} />;
}

// ─── Generic dropdown field ───────────────────────────────────────────────────

function DropField({
  label, value, options, onChange, color, disabled,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string) => void;
  color?: FieldColor;
  disabled?: boolean;
}) {
  const c = color ?? getFieldColor(value);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <ColorDot color={c} />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0 border-r border-gray-200 pr-2">{label}</span>
      {disabled ? (
        <span className="text-sm text-gray-700">{value || "—"}</span>
      ) : (
        <select
          className="text-sm border-0 bg-transparent focus:ring-0 p-0 cursor-pointer text-gray-800"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— wybierz —</option>
          {value && !options.includes(value) && <option value={value}>{value} (archiwalne)</option>}
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Text field ───────────────────────────────────────────────────────────────

function TextField({
  label, value, onChange, disabled, type = "text",
}: {
  label: string; value: string | undefined; onChange: (v: string) => void;
  disabled?: boolean; type?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-2.5 flex-shrink-0" />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0 border-r border-gray-200 pr-2">{label}</span>
      {disabled ? (
        <span className="text-sm text-gray-700">{value || "—"}</span>
      ) : (
        <input
          type={type}
          className="text-sm border-0 bg-transparent focus:ring-0 p-0 flex-1 min-w-0 text-gray-800"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="..."
        />
      )}
    </div>
  );
}

// ─── Multi-line text field (auto-growing textarea) ───────────────────────

function TextAreaField({
  label, value, onChange, disabled,
}: {
  label: string; value: string | undefined; onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-2.5 flex-shrink-0 mt-1" />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0 border-r border-gray-200 pr-2 mt-1">{label}</span>
      {disabled ? (
        <span className="text-sm text-gray-700 whitespace-pre-wrap break-words min-w-0 flex-1">{value || "—"}</span>
      ) : (
        <textarea
          className="text-sm border rounded px-2 py-1 flex-1 min-w-0 text-gray-800 resize-y"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="..."
          rows={Math.max(2, (value || "").split("\n").length)}
          style={{ minHeight: "2.5rem" }}
        />
      )}
    </div>
  );
}

// ─── Amount field ─────────────────────────────────────────────────────────────

function AmountField({
  label, value, paymentStatus, onChange, disabled,
}: {
  label: string; value: string | undefined; paymentStatus?: string;
  onChange: (v: string) => void; disabled?: boolean;
}) {
  const c = getAmountColor(value, paymentStatus);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <ColorDot color={c} />
      <span className="text-xs text-gray-500 w-48 flex-shrink-0 border-r border-gray-200 pr-2">{label}</span>
      {disabled ? (
        <span className="text-sm text-gray-700">{value || "—"} zł</span>
      ) : (
        <input
          type="text"
          className="text-sm border-0 bg-transparent focus:ring-0 p-0 w-24 text-gray-800"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      )}
    </div>
  );
}

// ─── Dropdown with custom text + manual color override ────────────────────────

const COLOR_OPTIONS: { value: FieldColor; label: string; cls: string }[] = [
  { value: "green", label: "Zielony", cls: "bg-green-500" },
  { value: "yellow", label: "Żółty", cls: "bg-yellow-400" },
  { value: "red", label: "Czerwony", cls: "bg-red-500" },
  { value: "gray", label: "Szary", cls: "bg-gray-300" },
];

function DropFieldWithCustom({
  label, value, customText, customColor, options, onChange, onCustomTextChange, onCustomColorChange, disabled,
}: {
  label: string; value: string | undefined; customText?: string; customColor?: FieldColor;
  options: string[]; onChange: (v: string) => void;
  onCustomTextChange?: (v: string) => void; onCustomColorChange?: (v: FieldColor) => void;
  disabled?: boolean;
}) {
  const isCustom = value === "Do wpisania";
  const displayColor = customColor ?? getFieldColor(value);
  return (
    <div className="py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <ColorDot color={displayColor} />
        <span className="text-xs text-gray-500 w-48 flex-shrink-0 border-r border-gray-200 pr-2">{label}</span>
        {disabled ? (
          <span className="text-sm text-gray-700">{isCustom && customText ? `${value}: ${customText}` : (value || "—")}</span>
        ) : (
          <select className="text-sm border-0 bg-transparent focus:ring-0 p-0 cursor-pointer text-gray-800" value={value || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">— wybierz —</option>
            {value && !options.includes(value) && <option value={value}>{value} (archiwalne)</option>}
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>
      {isCustom && !disabled && (
        <div className="flex items-center gap-2 ml-5 mt-1">
          <input type="text" className="text-sm border rounded px-2 py-0.5 flex-1 min-w-0" value={customText || ""} onChange={(e) => onCustomTextChange?.(e.target.value)} placeholder="Wpisz szczegóły..." />
          <div className="flex gap-1">
            {COLOR_OPTIONS.map((co) => (
              <button key={co.value} type="button" onClick={() => onCustomColorChange?.(co.value)}
                className={`w-4 h-4 rounded-full ${co.cls} ${customColor === co.value ? "ring-2 ring-offset-1 ring-blue-500" : "opacity-60 hover:opacity-100"}`}
                title={co.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comment field for 3A ─────────────────────────────────────────────────────

function CommentField({ value, onChange, disabled }: { value: string | undefined; onChange: (v: string) => void; disabled?: boolean }) {
  if (disabled && !value) return null;
  return (
    <div className="flex items-center gap-2 py-0.5 ml-5">
      <span className="w-2.5 flex-shrink-0" />
      <span className="text-xs text-gray-400 w-48 flex-shrink-0">↳ komentarz</span>
      {disabled ? <span className="text-xs text-gray-500 italic">{value}</span> : (
        <input type="text" className="text-xs border-0 bg-transparent focus:ring-0 p-0 flex-1 min-w-0 text-gray-500 italic" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="komentarz..." />
      )}
    </div>
  );
}

// ─── Payment status with partial amount fields ──────────────────────────────

function PaymentStatusField({
  label, value, nieOplacono, nieUzyskano, options, onChange, onNieOplaconoChange, onNieUzyskanoChange, disabled,
}: {
  label: string; value: string | undefined; nieOplacono?: string; nieUzyskano?: string;
  options: string[]; onChange: (v: string) => void;
  onNieOplaconoChange?: (v: string) => void; onNieUzyskanoChange?: (v: string) => void;
  disabled?: boolean;
}) {
  const isNieOplacono = value?.startsWith("Nie opłacono");
  const isNieUzyskano = value?.startsWith("Nie uzyskano");
  return (
    <div className="py-1.5 border-b border-gray-100 last:border-0">
      <DropField label={label} value={value} options={options} onChange={onChange} disabled={disabled} />
      {isNieOplacono && !disabled && (
        <div className="flex items-center gap-2 ml-5 mt-1">
          <ColorDot color="yellow" />
          <span className="text-xs text-gray-500 w-36">Pozostała kwota</span>
          <input type="text" className="text-sm border rounded px-2 py-0.5 w-24" value={nieOplacono || ""} onChange={(e) => onNieOplaconoChange?.(e.target.value)} placeholder="0 zł" />
        </div>
      )}
      {isNieUzyskano && !disabled && (
        <div className="flex items-center gap-2 ml-5 mt-1">
          <ColorDot color="red" />
          <span className="text-xs text-gray-500 w-36">Kwota stracona</span>
          <input type="text" className="text-sm border rounded px-2 py-0.5 w-24" value={nieUzyskano || ""} onChange={(e) => onNieUzyskanoChange?.(e.target.value)} placeholder="0 zł" />
        </div>
      )}
    </div>
  );
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({
  title, closed, canEdit, onToggleClose, onSave, saving, children,
  hasYellow, isAdmin, subModulesOpen,
}: {
  title: string; closed: boolean; canEdit: boolean;
  onToggleClose: () => void; onSave: () => void; saving: boolean;
  children: React.ReactNode;
  hasYellow?: boolean; isAdmin?: boolean; subModulesOpen?: string[];
}) {
  const blockClose = !closed && !isAdmin && hasYellow;
  const blockBySubModules = !closed && subModulesOpen && subModulesOpen.length > 0;
  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${closed ? "opacity-75" : ""}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          {closed && <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />}
          <h3 className="font-medium text-sm text-gray-800">{title}</h3>
          {closed && <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Zamknięty</span>}
        </div>
        {canEdit && (
          <div className="flex gap-2 items-center">
            <button
              onClick={onSave}
              disabled={saving}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Zapisuję..." : "Zapisz"}
            </button>
            <button
              onClick={closed ? onToggleClose : (blockClose || blockBySubModules ? undefined : onToggleClose)}
              disabled={!closed && (blockClose || !!blockBySubModules)}
              title={blockClose ? "Nie można zamknąć — są pola do uzupełnienia" : blockBySubModules ? `Otwarte podmoduły: ${subModulesOpen!.join(", ")}` : undefined}
              className={`text-xs px-3 py-1 rounded border ${closed ? "border-gray-300 text-gray-600 hover:bg-gray-100" : (blockClose || blockBySubModules) ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-green-500 text-green-700 hover:bg-green-50"}`}
            >
              {closed ? "Otwórz" : "Zamknij moduł"}
            </button>
          </div>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ─── Sub-module header with close toggle ──────────────────────────────────────

function SubModuleHeader({
  title, closed, canEdit, onToggle, hasYellow, isAdmin,
}: {
  title: string; closed: boolean; canEdit: boolean; onToggle: () => void;
  hasYellow?: boolean; isAdmin?: boolean;
}) {
  const blockClose = !closed && !isAdmin && hasYellow;
  return (
    <div className="flex items-center justify-between mt-3 mb-2">
      <div className="flex items-center gap-2">
        {closed && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
        <p className={`text-xs font-semibold uppercase ${closed ? "text-green-600" : "text-gray-700"}`}>{title}</p>
        {closed && <span className="text-xs text-green-700 bg-green-100 px-1 py-0 rounded">Zamknięty</span>}
      </div>
      {canEdit && (
        <button
          onClick={blockClose ? undefined : onToggle}
          disabled={!!blockClose}
          title={blockClose ? "Nie można zamknąć — są pola do uzupełnienia" : undefined}
          className={`text-xs px-2 py-0.5 rounded border ${closed ? "border-gray-300 text-gray-500 hover:bg-gray-100" : blockClose ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-green-400 text-green-600 hover:bg-green-50"}`}
        >
          {closed ? "Otwórz" : "Zamknij"}
        </button>
      )}
    </div>
  );
}

// ─── Option lists ─────────────────────────────────────────────────────────────

const DOC_STATUS = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano", "Nie dotyczy"];
const DOC_STATUS_NO_ND = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano"]; // Umowa, RODO — always required
const DOC_STATUS_ELEKTR = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano", "Nie dotyczy", "Odmowa"]; // Oświadczenie elektr. — Odmowa = green
const KRK_STATUS = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano", "Nie dotyczy"];
const ACCESS_STATUS = ["Aktywne", "Dezaktywowane", "Nie dotyczy"];
const PAYMENT_STATUS = ["Komplet", "Opłacono - z subkonta", "Opłacono - wpłata zewnętrzna", "Opłacono - gotówka", "Nie opłacono: proszę uzupełnić", "Nie uzyskano spłaty"];
const MBANK_STATUS = ["Do wyzerowania", "Na opłaty", "Na VAT", "Do wyjaśnienia"];
const BRANZE = ["Lektor", "IT", "E-commerce", "Grafik", "Architekt", "Fotograf", "Tłumacz", "Coaching", "Consulting", "inne", "Do uzupełnienia"];
const PESEL_STATUS = ["Do wpisania", "Komplet", "Do uzupełnienia", "Beneficjent nie posiada PESEL"];
const DANE_KONTAKTOWE_STATUS = ["Do wpisania", "Komplet", "Do uzupełnienia", "Brak adresu zamieszkania", "Brak telefonu"];
const WYP_STATUS = ["Oryginał", "Skan", "Do uzupełnienia", "Nie uzyskano"];
const ZWUA_STATUS = ["Wysłane", "Do uzupełnienia"];
const DOK3_STATUS = ["Do wpisania", "Komplet", "Nie uzyskano: proszę uzupełnić"];
const B2B_WYP = ["Wysłane", "Do wysłania", "Niepotrzebne"];
const BRAMKI_RODZAJ = ["PayU", "Stripe", "inne", "Nie dotyczy"];
const BRAMKI_STATUS = ["Aktywne", "Zamknięte", "Potwierdzenie - dostarczone", "Potwierdzenie - brak"];
const DOMENA_RODZAJ = ["Cesja", "Nie dotyczy"];
const DOMENA_STATUS = ["Do uzupełnienia", "Podpisana i wysłana", "Niepotrzebne"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PzkCasePage() {
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

  // Module draft states
  const [mod2, setMod2] = useState<Mod2Admin>({});
  const [mod3, setMod3] = useState<Mod3Kadry>({});
  const [mod4, setMod4] = useState<Mod4Ksieg>({});
  const [mod5, setMod5] = useState<Mod5Legal>({});
  const [mod6, setMod6] = useState<Mod6Platnosci>({});
  const [mod7, setMod7] = useState<Mod7Umowy>({});
  const [mod8, setMod8] = useState<Mod8Inne>({});

  // Module 1 editable fields
  const [mod1LastName, setMod1LastName] = useState("");
  const [mod1FirstNames, setMod1FirstNames] = useState("");
  const [mod1Email, setMod1Email] = useState("");
  const [mod1ClientType, setMod1ClientType] = useState<PzkClientType>("STANDARD_KADRY");
  const [mod1Worker, setMod1Worker] = useState("");
  const [savingMod1, setSavingMod1] = useState(false);
  const [workers, setWorkers] = useState<{ id: string; fullName: string; dept: string | null }[]>([]);

  const [savingMod, setSavingMod] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  // Contact log
  const [contactDate, setContactDate] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactStatus, setContactStatus] = useState<"W trakcie" | "Zakończono">("W trakcie");
  const [contactComment, setContactComment] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  // Internal comment
  const [internalComment, setInternalComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pzk/${id}`);
    if (!res.ok) { router.push("/panel/pzk"); return; }
    const data: PzkCase = await res.json();
    setC(data);
    setMod1LastName(data.lastName);
    setMod1FirstNames(data.firstNames);
    setMod1Email(data.benefEmail || "");
    setMod1ClientType(data.clientType);
    setMod1Worker(data.responsibleWorker || "");
    setMod2((data.mod2Admin as Mod2Admin) || {});
    setMod3((data.mod3Kadry as Mod3Kadry) || {});
    setMod4((data.mod4Ksieg as Mod4Ksieg) || {});
    setMod5((data.mod5Legal as Mod5Legal) || {});
    const m6raw = (data.mod6Platnosci as Mod6Platnosci) || {};
    // Migrate legacy oplatyBenefit to Multisport if new fields empty
    if (!m6raw.oplatyMultisport && m6raw.oplatyBenefit) {
      m6raw.oplatyMultisport = m6raw.oplatyBenefit;
      m6raw.oplatyMultisportZaOkres = m6raw.oplatyBenefitZaOkres;
      m6raw.oplatyMultisportStatus = m6raw.oplatyBenefitStatus;
    }
    setMod6(m6raw);
    // Migrate legacy single-entry to multi-entry format
    const m7raw = (data.mod7Umowy as Mod7Umowy) || {};
    if (!m7raw.b2bEntries && m7raw.b2bKontrahent) {
      m7raw.b2bEntries = [{ kontrahent: m7raw.b2bKontrahent, dataRozpoczecia: m7raw.b2bDataRozpoczecia, wypowiedzenie: m7raw.b2bWypowiedzenie, dataWypowiedzenia: m7raw.b2bDataWypowiedzenia }];
    }
    if (!m7raw.najmEntries && m7raw.najmUmowa) {
      m7raw.najmEntries = [{ umowa: m7raw.najmUmowa, dataRozpoczecia: m7raw.najmDataRozpoczecia, wypowiedzenie: m7raw.najmWypowiedzenie, dataWypowiedzenia: m7raw.najmDataWypowiedzenia }];
    }
    setMod7(m7raw);
    const m8raw = (data.mod8Inne as Mod8Inne) || {};
    if (!m8raw.bramkiEntries && m8raw.bramkiRodzaj) {
      m8raw.bramkiEntries = [{ rodzaj: m8raw.bramkiRodzaj, status: m8raw.bramkiStatus }];
    }
    if (!m8raw.domenaEntries && m8raw.domenaRodzaj) {
      m8raw.domenaEntries = [{ rodzaj: m8raw.domenaRodzaj, status: m8raw.domenaStatus }];
    }
    setMod8(m8raw);
    setInternalComment(data.internalComment || "");
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/pzk/workers").then(r => r.ok ? r.json() : []).then(setWorkers).catch(() => {}); }, []);

  useEffect(() => {
    if (c?.cooperationEndsAt) setDateValue(c.cooperationEndsAt.substring(0, 10));
  }, [c?.cooperationEndsAt]);

  async function saveMod1() {
    setSavingMod1(true);
    try {
      const res = await fetch(`/api/pzk/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName: mod1LastName, firstNames: mod1FirstNames,
          benefEmail: mod1Email || null, clientType: mod1ClientType,
          responsibleWorker: mod1Worker || null,
        }),
      });
      if (res.ok) setC(await res.json());
    } finally { setSavingMod1(false); }
  }

  async function saveModule(moduleKey: string, data: unknown) {
    setSavingMod(moduleKey);
    try {
      const res = await fetch(`/api/pzk/${id}/module`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, data }),
      });
      if (res.ok) {
        const updated: PzkCase = await res.json();
        setC(updated);
      }
    } finally {
      setSavingMod(null);
    }
  }

  async function toggleModuleClosed(flag: string, current: boolean) {
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: !current }),
    });
    if (res.ok) setC(await res.json());
  }

  async function closeModuleWithCascade(moduleFlag: string, subFlags: string[]) {
    const updates: Record<string, boolean> = { [moduleFlag]: true };
    for (const sf of subFlags) updates[sf] = true;
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) setC(await res.json());
  }

  async function handleSend() {
    setSendSaving(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/pzk/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUrgent, urgentLabel: isUrgent ? urgentLabel : null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(`Wysłano do ${data.recipientCount} grup odbiorców.`);
        load();
      } else {
        setSendResult(data.error || "Błąd wysyłania");
      }
    } finally {
      setSendSaving(false);
    }
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

  async function toggleCaseClosed() {
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseClosed: !c!.caseClosed }),
    });
    if (res.ok) setC(await res.json());
  }

  async function handleDelete() {
    setDeleteSaving(true);
    const res = await fetch(`/api/pzk/${id}`, { method: "DELETE" });
    if (res.ok) router.push(panelPath);
    else setDeleteSaving(false);
  }

  function openMailWindow() {
    const collected = collectBraki(c!, user?.dept ?? null, user?.role ?? "EMPLOYEE", uExtra);
    const brakiStr = collected.length > 0 ? collected.join(", ") : "[uzupełnij braki]";
    const endDate = c!.cooperationEndsAt
      ? new Date(c!.cooperationEndsAt).toLocaleDateString("pl-PL") : "[data]";
    const text = `Temat: Uzupełnienie braków przed końcem współpracy\n\nDzień dobry,\n\nW związku ze zbliżającym się końcem naszej współpracy (${endDate}), proszę o uzupełnienie braków: ${brakiStr}.\n\nProszę o dosłanie braków w ciągu [UZUPEŁNIJ TERMIN].\n\nW razie wątpliwości zapraszam do kontaktu, dziękuję.`;
    const fullName = `${c!.firstNames} ${c!.lastName}`;
    const w = window.open("", "_blank", "width=700,height=600");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Mail — ${fullName}</title><style>body{font-family:system-ui,sans-serif;padding:24px;background:#f9fafb}textarea{width:100%;height:350px;font-family:monospace;font-size:14px;padding:12px;border:1px solid #d1d5db;border-radius:8px;resize:vertical}button{margin-top:12px;padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px}button:hover{background:#1d4ed8}h2{margin:0 0 4px;font-size:16px;color:#111}p{margin:0 0 12px;font-size:12px;color:#6b7280}</style></head><body><h2>Mail do beneficjenta — ${fullName}</h2><p>Treść edytowalna — zaznaczone braki ze statusem żółtym/czerwonym.</p><textarea id="t">${text.replace(/</g, "&lt;")}</textarea><br><button onclick="navigator.clipboard.writeText(document.getElementById('t').value);this.textContent='Skopiowano!'">Kopiuj do schowka</button></body></html>`);
      w.document.close();
    }
  }

  async function addContact() {
    if (!contactSubject.trim()) return;
    const entry = {
      id: crypto.randomUUID(),
      date: contactDate || new Date().toISOString().substring(0, 10),
      subject: contactSubject,
      status: contactStatus,
      comment: contactComment,
      worker: user?.fullName || "—",
      createdAt: new Date().toISOString(),
    };
    const log = [...(c!.contactLog || []), entry];
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactLog: log }),
    });
    if (res.ok) { setC(await res.json()); setContactSubject(""); setContactComment(""); setShowContactForm(false); }
  }

  async function deleteContact(contactId: string) {
    const log = (c!.contactLog || []).filter(e => e.id !== contactId);
    const res = await fetch(`/api/pzk/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactLog: log }),
    });
    if (res.ok) setC(await res.json());
  }

  async function saveInternalComment() {
    setSavingComment(true);
    try {
      const res = await fetch(`/api/pzk/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalComment: internalComment || null }),
      });
      if (res.ok) setC(await res.json());
    } finally { setSavingComment(false); }
  }

  if (loading || !c) {
    return <div className="py-10 text-center text-gray-500">Ładowanie...</div>;
  }

  const fullName = `${c.firstNames} ${c.lastName}`;
  const isAdminOrSupervisor = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const uDept = user?.dept ?? null;
  const uRole = user?.role ?? "EMPLOYEE";
  const uExtra = (user as unknown as { extraDepts?: string[] })?.extraDepts;
  const canAdmin = canEditModule(uDept, uRole, "mod2", uExtra);
  const canKadry = canEditModule(uDept, uRole, "mod3", uExtra);
  const canEditWorkerField = canAdmin || user?.dept === "KADRY" || user?.dept === "HR" || uExtra?.includes("KADRY") || uExtra?.includes("HR");
  const canKsieg = canEditModule(uDept, uRole, "mod4", uExtra);
  const canLegal = canEditModule(uDept, uRole, "mod5", uExtra);
  const canOplaty = canEditModule(uDept, uRole, "mod6", uExtra);
  const canB2B = canEditModule(uDept, uRole, "mod7", uExtra);
  const canMod8 = canEditModule(uDept, uRole, "mod8", uExtra);

  const panelPath = c.panel === "PZK_TUTLO" ? "/panel/pzk-tutlo" : "/panel/pzk";

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <button onClick={() => router.push(panelPath)} className="text-sm text-blue-600 hover:underline mb-1">
            ← {c.panel === "PZK_TUTLO" ? "PZK Tutlo" : "PZK"}
          </button>
          <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1 items-center">
            <span>{PZK_CLIENT_TYPE_LABELS[c.clientType]}</span>
            {c.benefEmail && <span>{c.benefEmail}</span>}
            {/* Editable date */}
            {editingDate ? (
              <span className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="border rounded px-2 py-0.5 text-sm text-gray-800"
                />
                <button onClick={handleDateSave} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Zapisz</button>
                <button onClick={() => setEditingDate(false)} className="text-xs text-gray-400">Anuluj</button>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                Koniec: <strong>{c.cooperationEndsAt ? new Date(c.cooperationEndsAt).toLocaleDateString("pl-PL") : "—"}</strong>
                {canAdmin && (
                  <button onClick={() => setEditingDate(true)} title="Edytuj datę" className="text-gray-400 hover:text-blue-600 ml-0.5 leading-none">✎</button>
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
          <button onClick={openMailWindow} className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg border">
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
          {!c.caseClosed && !c.withdrawnFromNotice && (
            <button onClick={toggleCaseClosed} className="text-xs text-gray-600 hover:text-gray-900 border px-3 py-1.5 rounded-lg hover:bg-gray-50">
              Zamknij sprawę
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
          <span>Utworzył/a: <strong>{c.createdByName}</strong></span>
          {c.emailInitialSent && <span className="text-green-700">Powiadomienie wstępne wysłane</span>}
          {c.emailMid15Sent && <span className="text-blue-700">Powiadomienie 15. wysłane</span>}
          {c.emailFinal28Sent && <span className="text-orange-700">Powiadomienie 28. wysłane</span>}
        </div>
        {/* Color summary */}
        {(() => {
          const cc = countFieldColors(c);
          const closedUnits = closedUnitCount(c);
          return (
            <div>
              <div className="flex flex-wrap gap-3 text-xs mb-2">
                <span className="text-gray-600">Moduły: <strong>{closedUnits}/{TOTAL_CLOSE_UNITS}</strong> zamknięte</span>
                <span className="text-gray-500">Pól: <strong>{cc.total}</strong></span>
                {cc.undefined > 0 && <span className="text-gray-400">Nieokreślone: <strong>{cc.undefined}</strong></span>}
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> <strong>{cc.green}</strong></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> <strong>{cc.yellow}</strong></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> <strong>{cc.red}</strong></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> <strong>{cc.gray}</strong></span>
              </div>
            </div>
          );
        })()}
        {/* mBank info */}
        {(() => { const m2 = (c.mod2Admin || {}) as Mod2Admin; return (m2.biezaceSwrodkiMBank || m2.biezaceSwrodkiKomentarz) ? (
          <div className="text-xs text-gray-600 mb-2 flex gap-3">
            {m2.biezaceSwrodkiMBank && <span>mBank: <strong>{m2.biezaceSwrodkiMBank} zł</strong></span>}
            {m2.biezaceSwrodkiStatus && <span className="flex items-center gap-1"><ColorDot color={getFieldColor(m2.biezaceSwrodkiStatus)} /> {m2.biezaceSwrodkiStatus}</span>}
            {m2.biezaceSwrodkiKomentarz && <span className="text-gray-400 italic">{m2.biezaceSwrodkiKomentarz}</span>}
          </div>
        ) : null; })()}
        {/* Color legend */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Komplet / Zielony</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Do uzupełnienia</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Nie uzyskano</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Nie dotyczy</span>
        </div>
      </div>

      {/* Case closed banner */}
      {c.caseClosed && (
        <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Sprawa zamknięta — edycja zablokowana</span>
          {isAdminOrSupervisor && (
            <button onClick={() => toggleCaseClosed()} className="text-xs text-blue-600 hover:underline">Otwórz ponownie</button>
          )}
        </div>
      )}

      {/* Contact log */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Kontakt z Beneficjentem</h3>
          <button type="button" onClick={() => setShowContactForm(!showContactForm)} className="text-xs text-blue-600 hover:underline">
            {showContactForm ? "Anuluj" : "+ Dodaj kontakt"}
          </button>
        </div>
        {showContactForm && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex gap-2">
              <input type="date" value={contactDate} onChange={(e) => setContactDate(e.target.value)} className="border rounded px-2 py-1 text-sm flex-shrink-0" />
              <input type="text" value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} placeholder="W sprawie..." className="border rounded px-2 py-1 text-sm flex-1" />
              <select value={contactStatus} onChange={(e) => setContactStatus(e.target.value as "W trakcie" | "Zakończono")} className="border rounded px-2 py-1 text-sm">
                <option value="W trakcie">W trakcie</option>
                <option value="Zakończono">Zakończono</option>
              </select>
            </div>
            <input type="text" value={contactComment} onChange={(e) => setContactComment(e.target.value)} placeholder="Komentarz..." className="w-full border rounded px-2 py-1 text-sm" />
            <button type="button" onClick={addContact} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Dodaj</button>
          </div>
        )}
        {(c.contactLog || []).length === 0 ? (
          <p className="text-xs text-gray-400">Brak wpisów</p>
        ) : (
          <div className="divide-y text-sm">
            {[...(c.contactLog || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((entry) => (
              <div key={entry.id} className="py-2 flex items-start gap-3">
                <span className="text-xs text-gray-400 w-20 flex-shrink-0">{entry.date}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-800">{entry.subject}</span>
                    <span className={`text-xs px-1.5 py-0 rounded ${entry.status === "Zakończono" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{entry.status}</span>
                  </div>
                  {entry.comment && <p className="text-xs text-gray-500 mt-0.5">{entry.comment}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">— {entry.worker}</p>
                </div>
                {(entry.worker === user?.fullName || isAdminOrSupervisor) && (
                  <button type="button" onClick={() => deleteContact(entry.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Usuń</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Internal comment */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Komentarz wewnętrzny</h3>
          <button type="button" onClick={saveInternalComment} disabled={savingComment} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
            {savingComment ? "Zapisuję..." : "Zapisz"}
          </button>
        </div>
        <textarea
          value={internalComment}
          onChange={(e) => setInternalComment(e.target.value)}
          rows={3}
          className="w-full border rounded-lg p-2 text-sm resize-y"
          placeholder="Notatki wewnętrzne zespołu..."
        />
      </div>

      {/* Modules */}
      <div className="space-y-3">

        {/* ── Module 1: Beneficjent (editable) ── */}
        <ModuleCard
          title="1. Beneficjent"
          closed={c.mod1Closed}
          canEdit={canAdmin}
          onToggleClose={() => toggleModuleClosed("mod1Closed", c.mod1Closed)}
          onSave={saveMod1}
          saving={savingMod1}
        >
          <TextField label="Nazwisko" value={mod1LastName} onChange={setMod1LastName} disabled={!canAdmin} />
          <TextField label="Imiona" value={mod1FirstNames} onChange={setMod1FirstNames} disabled={!canAdmin} />
          <TextField label="E-mail" value={mod1Email} onChange={setMod1Email} disabled={!canAdmin} />
          <div className="flex items-center gap-2 py-1.5 border-b border-gray-100">
            <span className="w-2.5 flex-shrink-0" />
            <span className="text-xs text-gray-500 w-48 flex-shrink-0">Rodzaj klienta</span>
            {!canAdmin ? <span className="text-sm text-gray-700">{PZK_CLIENT_TYPE_LABELS[mod1ClientType]}</span> : (
              <select className="text-sm border-0 bg-transparent focus:ring-0 p-0 cursor-pointer text-gray-800" value={mod1ClientType} onChange={(e) => setMod1ClientType(e.target.value as PzkClientType)}>
                {(Object.entries(PZK_CLIENT_TYPE_LABELS) as [PzkClientType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 py-1.5 border-b border-gray-100">
            <span className="w-2.5 flex-shrink-0" />
            <span className="text-xs text-gray-500 w-48 flex-shrink-0">Pracownik odpowiedzialny</span>
            {!canEditWorkerField ? <span className="text-sm text-gray-700">{mod1Worker || "—"}</span> : (
              <>
                <select className="text-sm border-0 bg-transparent focus:ring-0 p-0 cursor-pointer text-gray-800" value={mod1Worker} onChange={(e) => setMod1Worker(e.target.value)}>
                  <option value="">— wybierz —</option>
                  {workers.map((w) => <option key={w.id} value={w.fullName}>{w.fullName}{w.dept ? ` (${w.dept})` : ""}</option>)}
                </select>
                {!canAdmin && (
                  <button onClick={saveMod1} disabled={savingMod1} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50 ml-2">
                    {savingMod1 ? "..." : "Zapisz"}
                  </button>
                )}
              </>
            )}
          </div>
        </ModuleCard>

        {/* ── Module 2: Administration ── */}
        <ModuleCard
          title="2. Dział Administracji"
          closed={c.mod2Closed}
          canEdit={canAdmin}
          onToggleClose={() => c.mod2Closed ? toggleModuleClosed("mod2Closed", true) : closeModuleWithCascade("mod2Closed", ["mod2AClosed", "mod2BClosed", "mod2CClosed"])}
          onSave={() => saveModule("mod2Admin", mod2)}
          saving={savingMod === "mod2Admin"}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod2AClosed ? ["2A"] : []), ...(!c.mod2BClosed ? ["2B"] : []), ...(!c.mod2CClosed ? ["2C"] : [])]}
        >
          <SubModuleHeader title="2A — Informacje o współpracy" closed={c.mod2AClosed} canEdit={canAdmin} onToggle={() => toggleModuleClosed("mod2AClosed", c.mod2AClosed)} />
          <TextField label="Skąd informacja o wypowiedzeniu" value={mod2.infoSource} onChange={(v) => setMod2(d => ({ ...d, infoSource: v }))} disabled={!canAdmin} />
          <DropField label="Wypowiedzenie" value={mod2.wypowiedzenie} options={WYP_STATUS} onChange={(v) => setMod2(d => ({ ...d, wypowiedzenie: v as never }))} disabled={!canAdmin} />
          <TextField label="Data startu / CRM" value={mod2.dataStartuCRM} onChange={(v) => setMod2(d => ({ ...d, dataStartuCRM: v }))} disabled={!canAdmin} type="date" />

          <SubModuleHeader title="2B — Dokumenty wstępne" closed={c.mod2BClosed} canEdit={canAdmin} onToggle={() => toggleModuleClosed("mod2BClosed", c.mod2BClosed)} />
          <DropFieldWithCustom label="PESEL" value={mod2.pesel} customText={mod2.peselCustomText} customColor={mod2.peselCustomColor} options={PESEL_STATUS} onChange={(v) => setMod2(d => ({ ...d, pesel: v }))} onCustomTextChange={(v) => setMod2(d => ({ ...d, peselCustomText: v }))} onCustomColorChange={(v) => setMod2(d => ({ ...d, peselCustomColor: v }))} disabled={!canAdmin} />
          <DropFieldWithCustom label="Dane kontaktowe" value={mod2.daneKontaktowe} customText={mod2.daneKontaktoweCustomText} customColor={mod2.daneKontaktoweCustomColor} options={DANE_KONTAKTOWE_STATUS} onChange={(v) => setMod2(d => ({ ...d, daneKontaktowe: v }))} onCustomTextChange={(v) => setMod2(d => ({ ...d, daneKontaktoweCustomText: v }))} onCustomColorChange={(v) => setMod2(d => ({ ...d, daneKontaktoweCustomColor: v }))} disabled={!canAdmin} />
          <DropFieldWithCustom label="Branża" value={mod2.branza} customText={mod2.branzaCustomText} customColor={mod2.branzaCustomColor} options={BRANZE} onChange={(v) => setMod2(d => ({ ...d, branza: v }))} onCustomTextChange={(v) => setMod2(d => ({ ...d, branzaCustomText: v }))} onCustomColorChange={(v) => setMod2(d => ({ ...d, branzaCustomColor: v }))} disabled={!canAdmin} />
          <DropField label="Umowa" value={mod2.umowa} options={DOC_STATUS_NO_ND} onChange={(v) => setMod2(d => ({ ...d, umowa: v as never }))} disabled={!canAdmin} />
          <CommentField value={mod2.umowaKomentarz} onChange={(v) => setMod2(d => ({ ...d, umowaKomentarz: v }))} disabled={!canAdmin} />
          <DropField label="RODO" value={mod2.rodo} options={DOC_STATUS_NO_ND} onChange={(v) => setMod2(d => ({ ...d, rodo: v as never }))} disabled={!canAdmin} />
          <CommentField value={mod2.rodoKomentarz} onChange={(v) => setMod2(d => ({ ...d, rodoKomentarz: v }))} disabled={!canAdmin} />
          <DropField label="Oświadczenie twórcy" value={mod2.oswiadczenieTworcy} options={DOC_STATUS} onChange={(v) => setMod2(d => ({ ...d, oswiadczenieTworcy: v as never }))} disabled={!canAdmin} />
          <CommentField value={mod2.oswiadczenieTworcyKomentarz} onChange={(v) => setMod2(d => ({ ...d, oswiadczenieTworcyKomentarz: v }))} disabled={!canAdmin} />
          <DropFieldWithCustom label="KRK" value={mod2.krk} customText={mod2.krkCustomText} customColor={mod2.krkCustomColor} options={KRK_STATUS} onChange={(v) => setMod2(d => ({ ...d, krk: v }))} onCustomTextChange={(v) => setMod2(d => ({ ...d, krkCustomText: v }))} onCustomColorChange={(v) => setMod2(d => ({ ...d, krkCustomColor: v }))} disabled={!canAdmin} />
          <CommentField value={mod2.krkKomentarz} onChange={(v) => setMod2(d => ({ ...d, krkKomentarz: v }))} disabled={!canAdmin} />
          <DropField label="Oświadczenie do wys. elektr." value={mod2.oswiadczenieElektroniczne} options={DOC_STATUS_ELEKTR} onChange={(v) => setMod2(d => ({ ...d, oswiadczenieElektroniczne: v as never }))} disabled={!canAdmin} />
          <CommentField value={mod2.oswiadczenieElektroniczneKomentarz} onChange={(v) => setMod2(d => ({ ...d, oswiadczenieElektroniczneKomentarz: v }))} disabled={!canAdmin} />

          <SubModuleHeader title="2C — Dostępy" closed={c.mod2CClosed} canEdit={canAdmin} onToggle={() => toggleModuleClosed("mod2CClosed", c.mod2CClosed)} />
          <DropField label="Benefit System" value={mod2.benefitSystem} options={ACCESS_STATUS} onChange={(v) => setMod2(d => ({ ...d, benefitSystem: v as never }))} disabled={!canAdmin} />
          <DropField label="Konto mBank" value={mod2.kontoMBank} options={ACCESS_STATUS} onChange={(v) => setMod2(d => ({ ...d, kontoMBank: v as never }))} disabled={!canAdmin} />
          <DropField label="Konto CRM" value={mod2.kontoCRM} options={ACCESS_STATUS} onChange={(v) => setMod2(d => ({ ...d, kontoCRM: v as never }))} disabled={!canAdmin} />
          <AmountField label="Bieżące środki mBank" value={mod2.biezaceSwrodkiMBank} onChange={(v) => setMod2(d => ({ ...d, biezaceSwrodkiMBank: v }))} disabled={!canAdmin} />
          <DropField label="Status środków" value={mod2.biezaceSwrodkiStatus} options={MBANK_STATUS} onChange={(v) => setMod2(d => ({ ...d, biezaceSwrodkiStatus: v }))} disabled={!canAdmin} />
          <TextField label="Komentarz (mBank)" value={mod2.biezaceSwrodkiKomentarz} onChange={(v) => setMod2(d => ({ ...d, biezaceSwrodkiKomentarz: v }))} disabled={!canAdmin} />
        </ModuleCard>

        {/* ── Module 3: Kadry — sprawy kadrowe ── */}
        <ModuleCard
          title="3. Dział Kadr — sprawy kadrowe"
          closed={c.mod3Closed}
          canEdit={canKadry}
          onToggleClose={() => c.mod3Closed ? toggleModuleClosed("mod3Closed", true) : closeModuleWithCascade("mod3Closed", ["mod3AClosed", "mod3PayClosed", "mod3LegitClosed"])}
          onSave={() => saveModule("mod3Kadry", mod3)}
          saving={savingMod === "mod3Kadry"}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod3AClosed ? ["3A"] : []), ...(!c.mod3PayClosed ? ["3B"] : []), ...(!c.mod3LegitClosed ? ["3C"] : [])]}
        >
          <SubModuleHeader title="3A — Dokumenty" closed={c.mod3AClosed} canEdit={canKadry} onToggle={() => toggleModuleClosed("mod3AClosed", c.mod3AClosed)} />
          <TextAreaField label="Braki HR/Kadry – dokumenty" value={mod3.brakiKadryDok} onChange={(v) => setMod3(d => ({ ...d, brakiKadryDok: v }))} disabled={!canKadry} />
          <CommentField value={mod3.brakiKadryDokKomentarz} onChange={(v) => setMod3(d => ({ ...d, brakiKadryDokKomentarz: v }))} disabled={!canKadry} />
          <TextAreaField label="Uzupełnione" value={mod3.brakiKadryDokUzup} onChange={(v) => setMod3(d => ({ ...d, brakiKadryDokUzup: v }))} disabled={!canKadry} />
          <CommentField value={mod3.brakiKadryDokUzupKomentarz} onChange={(v) => setMod3(d => ({ ...d, brakiKadryDokUzupKomentarz: v }))} disabled={!canKadry} />

          <SubModuleHeader title="3B — Płatności" closed={c.mod3PayClosed} canEdit={canKadry} onToggle={() => toggleModuleClosed("mod3PayClosed", c.mod3PayClosed)} />
          <AmountField label="Braki HR/Kadry – płatności" value={mod3.brakiKadryPlatnosci} paymentStatus={mod3.brakiKadryPlatnosciStatus} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosci: v }))} disabled={!canKadry} />
          <CommentField value={mod3.brakiKadryPlatnosciKomentarz} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciKomentarz: v }))} disabled={!canKadry} />
          <TextField label="Opłaty za" value={mod3.brakiKadryPlatnosciOplatyZa} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciOplatyZa: v }))} disabled={!canKadry} />
          <CommentField value={mod3.brakiKadryPlatnosciOplatyZaKomentarz} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciOplatyZaKomentarz: v }))} disabled={!canKadry} />
          <PaymentStatusField label="Status opłat" value={mod3.brakiKadryPlatnosciStatus} nieOplacono={mod3.brakiKadryPlatnosciNieOplacono} nieUzyskano={mod3.brakiKadryPlatnosciNieUzyskano} options={PAYMENT_STATUS} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciStatus: v }))} onNieOplaconoChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciNieOplacono: v }))} onNieUzyskanoChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciNieUzyskano: v }))} disabled={!canKadry} />
          <CommentField value={mod3.brakiKadryPlatnosciStatusKomentarz} onChange={(v) => setMod3(d => ({ ...d, brakiKadryPlatnosciStatusKomentarz: v }))} disabled={!canKadry} />

          <SubModuleHeader title="3C — Legitymacje" closed={c.mod3LegitClosed} canEdit={canKadry} onToggle={() => toggleModuleClosed("mod3LegitClosed", c.mod3LegitClosed)} />
          <DropField label="Legitymacja" value={mod3.legitymacja} options={["Do wpisania", "Komplet", "Nie dotyczy"]} onChange={(v) => setMod3(d => ({ ...d, legitymacja: v }))} disabled={!canKadry} />
          <CommentField value={mod3.legitymacjaKomentarz} onChange={(v) => setMod3(d => ({ ...d, legitymacjaKomentarz: v }))} disabled={!canKadry} />
        </ModuleCard>

        {/* ── Module 4: Kadry — ubezpieczenia ── */}
        <ModuleCard
          title="4. Dział Kadr — ubezpieczenia"
          closed={c.mod3BClosed}
          canEdit={canKadry}
          onToggleClose={() => c.mod3BClosed ? toggleModuleClosed("mod3BClosed", true) : closeModuleWithCascade("mod3BClosed", ["mod4UbezpAClosed", "mod4UbezpBClosed"])}
          onSave={() => saveModule("mod3Kadry", mod3)}
          saving={savingMod === "mod3Kadry"}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod4UbezpAClosed ? ["4A"] : []), ...(!c.mod4UbezpBClosed ? ["4B"] : [])]}
        >
          {/* "Nie dotyczy — zamknij moduł" button */}
          {canKadry && !c.mod3BClosed && !mod3.ubezpNieDotyczy && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  setMod3(d => ({ ...d, ubezpNieDotyczy: true }));
                }}
                className="text-xs text-gray-500 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
              >
                Nie dotyczy — zamknij moduł
              </button>
            </div>
          )}
          {mod3.ubezpNieDotyczy && !c.mod3BClosed && canKadry && (
            <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Oznaczony jako „Nie dotyczy" — kliknij Zapisz, aby zamknąć moduł automatycznie
              <button
                type="button"
                onClick={() => setMod3(d => ({ ...d, ubezpNieDotyczy: false }))}
                className="text-xs text-blue-500 hover:underline ml-1"
              >
                Cofnij
              </button>
            </div>
          )}
          {mod3.ubezpNieDotyczy && c.mod3BClosed && (
            <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Oznaczony jako „Nie dotyczy"
            </div>
          )}

          <SubModuleHeader title="4A — Płatności" closed={c.mod4UbezpAClosed || c.mod3BClosed} canEdit={canKadry && !c.mod3BClosed} onToggle={() => toggleModuleClosed("mod4UbezpAClosed", c.mod4UbezpAClosed)} />
          <AmountField label="Braki UZ – płatności" value={mod3.brakiUZPlatnosci} paymentStatus={mod3.brakiUZPlatnosciStatus} onChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosci: v }))} disabled={!canKadry || c.mod3BClosed} />
          <TextField label="Opłaty za" value={mod3.brakiUZPlatnosciOplatyZa} onChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosciOplatyZa: v }))} disabled={!canKadry || c.mod3BClosed} />
          <PaymentStatusField label="Status opłat" value={mod3.brakiUZPlatnosciStatus} nieOplacono={mod3.brakiUZPlatnosciNieOplacono} nieUzyskano={mod3.brakiUZPlatnosciNieUzyskano} options={PAYMENT_STATUS} onChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosciStatus: v }))} onNieOplaconoChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosciNieOplacono: v }))} onNieUzyskanoChange={(v) => setMod3(d => ({ ...d, brakiUZPlatnosciNieUzyskano: v }))} disabled={!canKadry || c.mod3BClosed} />

          <SubModuleHeader title="4B — ZWUA" closed={c.mod4UbezpBClosed || c.mod3BClosed} canEdit={canKadry && !c.mod3BClosed} onToggle={() => toggleModuleClosed("mod4UbezpBClosed", c.mod4UbezpBClosed)} />
          <DropField label="ZWUA" value={mod3.zwua} options={ZWUA_STATUS} onChange={(v) => setMod3(d => ({ ...d, zwua: v as never }))} disabled={!canKadry || c.mod3BClosed} />
          <TextField label="Data ZWUA" value={mod3.dataZwua} onChange={(v) => setMod3(d => ({ ...d, dataZwua: v }))} disabled={!canKadry || c.mod3BClosed} type="date" />
          <TextField label="Komentarz kadrowy" value={mod3.komentarzKadrowy} onChange={(v) => setMod3(d => ({ ...d, komentarzKadrowy: v }))} disabled={!canKadry || c.mod3BClosed} />
        </ModuleCard>

        {/* ── Module 5: Księgowość ── */}
        <ModuleCard
          title="5. Dział Księgowy"
          closed={c.mod4Closed}
          canEdit={canKsieg}
          onToggleClose={() => c.mod4Closed ? toggleModuleClosed("mod4Closed", true) : closeModuleWithCascade("mod4Closed", ["mod4AClosed", "mod4BClosed"])}
          onSave={() => saveModule("mod4Ksieg", mod4)}
          saving={savingMod === "mod4Ksieg"}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod4AClosed ? ["5A"] : []), ...(!c.mod4BClosed ? ["5B"] : [])]}
        >
          <SubModuleHeader title="5A — Dokumenty" closed={c.mod4AClosed} canEdit={canKsieg} onToggle={() => toggleModuleClosed("mod4AClosed", c.mod4AClosed)} />
          <TextAreaField label="Braki księgowość – dokumenty" value={mod4.brakiKsiegDok} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegDok: v }))} disabled={!canKsieg} />
          <TextAreaField label="Uzupełnione" value={mod4.brakiKsiegDokUzup} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegDokUzup: v }))} disabled={!canKsieg} />

          <SubModuleHeader title="5B — Płatności" closed={c.mod4BClosed} canEdit={canKsieg} onToggle={() => toggleModuleClosed("mod4BClosed", c.mod4BClosed)} />
          <AmountField label="Braki księgowość – płatności" value={mod4.brakiKsiegPlatnosci} paymentStatus={mod4.brakiKsiegPlatnosciStatus} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosci: v }))} disabled={!canKsieg} />
          <TextField label="Opłaty za" value={mod4.brakiKsiegPlatnosciOplatyZa} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosciOplatyZa: v }))} disabled={!canKsieg} />
          <PaymentStatusField label="Status opłat" value={mod4.brakiKsiegPlatnosciStatus} nieOplacono={mod4.brakiKsiegPlatnosciNieOplacono} nieUzyskano={mod4.brakiKsiegPlatnosciNieUzyskano} options={PAYMENT_STATUS} onChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosciStatus: v }))} onNieOplaconoChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosciNieOplacono: v }))} onNieUzyskanoChange={(v) => setMod4(d => ({ ...d, brakiKsiegPlatnosciNieUzyskano: v }))} disabled={!canKsieg} />
          <TextField label="Komentarz księgowy" value={mod4.komentarzKsieg} onChange={(v) => setMod4(d => ({ ...d, komentarzKsieg: v }))} disabled={!canKsieg} />
        </ModuleCard>

        {/* ── Module 6: Legalizacja ── */}
        <ModuleCard
          title="6. Dział Legalizacji"
          closed={c.mod5Closed}
          canEdit={canLegal || canAdmin}
          onToggleClose={() => c.mod5Closed ? toggleModuleClosed("mod5Closed", true) : closeModuleWithCascade("mod5Closed", ["mod5AClosed", "mod5BClosed"])}
          onSave={() => saveModule("mod5Legal", mod5)}
          saving={savingMod === "mod5Legal"}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod5AClosed ? ["6A"] : []), ...(!c.mod5BClosed ? ["6B"] : [])]}
        >
          {/* "Nie dotyczy — zamknij moduł" button */}
          {(canLegal || canAdmin) && !c.mod5Closed && !mod5.legalNieDotyczy && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  setMod5(d => ({ ...d, legalNieDotyczy: true }));
                }}
                className="text-xs text-gray-500 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
              >
                Nie dotyczy — zamknij moduł
              </button>
            </div>
          )}
          {mod5.legalNieDotyczy && !c.mod5Closed && (canLegal || canAdmin) && (
            <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Oznaczony jako „Nie dotyczy" — kliknij Zapisz, aby zamknąć moduł automatycznie
              <button
                type="button"
                onClick={() => setMod5(d => ({ ...d, legalNieDotyczy: false }))}
                className="text-xs text-blue-500 hover:underline ml-1"
              >
                Cofnij
              </button>
            </div>
          )}
          {mod5.legalNieDotyczy && c.mod5Closed && (
            <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Oznaczony jako „Nie dotyczy"
            </div>
          )}

          <SubModuleHeader title="6A — Dokumenty" closed={c.mod5AClosed || c.mod5Closed} canEdit={canLegal && !c.mod5Closed} onToggle={() => toggleModuleClosed("mod5AClosed", c.mod5AClosed)} />
          <TextAreaField label="Braki legalizacja – dokumenty" value={mod5.brakiLegalDok} onChange={(v) => setMod5(d => ({ ...d, brakiLegalDok: v }))} disabled={!canLegal || c.mod5Closed} />
          <TextAreaField label="Uzupełnione" value={mod5.brakiLegalDokUzup} onChange={(v) => setMod5(d => ({ ...d, brakiLegalDokUzup: v }))} disabled={!canLegal || c.mod5Closed} />

          <SubModuleHeader title="6B — Płatności" closed={c.mod5BClosed || c.mod5Closed} canEdit={canLegal && !c.mod5Closed} onToggle={() => toggleModuleClosed("mod5BClosed", c.mod5BClosed)} />
          <AmountField label="Braki legalizacja – płatności" value={mod5.brakiLegalPlatnosci} paymentStatus={mod5.brakiLegalPlatnosciStatus} onChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosci: v }))} disabled={!canLegal || c.mod5Closed} />
          <TextField label="Opłaty za" value={mod5.brakiLegalPlatnosciOplatyZa} onChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosciOplatyZa: v }))} disabled={!canLegal || c.mod5Closed} />
          <PaymentStatusField label="Status opłat" value={mod5.brakiLegalPlatnosciStatus} nieOplacono={mod5.brakiLegalPlatnosciNieOplacono} nieUzyskano={mod5.brakiLegalPlatnosciNieUzyskano} options={PAYMENT_STATUS} onChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosciStatus: v }))} onNieOplaconoChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosciNieOplacono: v }))} onNieUzyskanoChange={(v) => setMod5(d => ({ ...d, brakiLegalPlatnosciNieUzyskano: v }))} disabled={!canLegal || c.mod5Closed} />
          <TextField label="Komentarz legalizacyjny" value={mod5.komentarzLegal} onChange={(v) => setMod5(d => ({ ...d, komentarzLegal: v }))} disabled={!canLegal || c.mod5Closed} />
        </ModuleCard>

        {/* ── Module 7: Płatności ── */}
        <ModuleCard
          title="7. Płatności"
          closed={c.mod6Closed}
          canEdit={canOplaty}
          onToggleClose={() => c.mod6Closed ? toggleModuleClosed("mod6Closed", true) : closeModuleWithCascade("mod6Closed", ["mod6AClosed", "mod6BClosed", "mod6CClosed"])}
          onSave={() => saveModule("mod6Platnosci", mod6)}
          saving={savingMod === "mod6Platnosci"}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod6AClosed ? ["7A"] : []), ...(!c.mod6BClosed ? ["7B"] : []), ...(!c.mod6CClosed ? ["7C"] : [])]}
        >
          <SubModuleHeader title="7A — Opłaty za współpracę" closed={c.mod6AClosed} canEdit={canOplaty} onToggle={() => toggleModuleClosed("mod6AClosed", c.mod6AClosed)} />
          <AmountField label="Kwota" value={mod6.oplatyWspolpraca} paymentStatus={mod6.oplatyWspolpracaStatus} onChange={(v) => setMod6(d => ({ ...d, oplatyWspolpraca: v }))} disabled={!canOplaty} />
          <TextField label="Opłaty za okres" value={mod6.oplatyWspolpracaZaOkres} onChange={(v) => setMod6(d => ({ ...d, oplatyWspolpracaZaOkres: v }))} disabled={!canOplaty} />
          <DropField label="Status opłat" value={mod6.oplatyWspolpracaStatus} options={PAYMENT_STATUS} onChange={(v) => setMod6(d => ({ ...d, oplatyWspolpracaStatus: v }))} disabled={!canOplaty} />

          <SubModuleHeader title="7B — Opłaty Benefit – Multisport" closed={c.mod6BClosed} canEdit={canOplaty} onToggle={() => toggleModuleClosed("mod6BClosed", c.mod6BClosed)} />
          <AmountField label="Kwota Multisport" value={mod6.oplatyMultisport} paymentStatus={mod6.oplatyMultisportStatus} onChange={(v) => setMod6(d => ({ ...d, oplatyMultisport: v }))} disabled={!canOplaty} />
          <TextField label="Opłaty za okres" value={mod6.oplatyMultisportZaOkres} onChange={(v) => setMod6(d => ({ ...d, oplatyMultisportZaOkres: v }))} disabled={!canOplaty} />
          <DropField label="Status opłat" value={mod6.oplatyMultisportStatus} options={[...PAYMENT_STATUS, "Nie dotyczy"]} onChange={(v) => setMod6(d => ({ ...d, oplatyMultisportStatus: v }))} disabled={!canOplaty} />

          <SubModuleHeader title="7C — Opłaty Benefit – Medicover" closed={c.mod6CClosed} canEdit={canOplaty} onToggle={() => toggleModuleClosed("mod6CClosed", c.mod6CClosed)} />
          <AmountField label="Kwota Medicover" value={mod6.oplatyMedicover} paymentStatus={mod6.oplatyMedicoverStatus} onChange={(v) => setMod6(d => ({ ...d, oplatyMedicover: v }))} disabled={!canOplaty} />
          <TextField label="Opłaty za okres" value={mod6.oplatyMedicoverZaOkres} onChange={(v) => setMod6(d => ({ ...d, oplatyMedicoverZaOkres: v }))} disabled={!canOplaty} />
          <DropField label="Status opłat" value={mod6.oplatyMedicoverStatus} options={[...PAYMENT_STATUS, "Nie dotyczy"]} onChange={(v) => setMod6(d => ({ ...d, oplatyMedicoverStatus: v }))} disabled={!canOplaty} />
        </ModuleCard>

        {/* ── Module 8A: Umowy B2B (multi-entry) ── */}
        <ModuleCard
          title="8A. Umowy B2B"
          closed={c.mod7AClosed}
          canEdit={canB2B}
          onToggleClose={() => toggleModuleClosed("mod7AClosed", c.mod7AClosed)}
          onSave={() => saveModule("mod7Umowy", mod7)}
          saving={savingMod === "mod7Umowy"}
        >
          {(mod7.b2bEntries || []).map((entry, i) => (
            <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-400">B2B #{i + 1}</span>
                {canB2B && <button type="button" onClick={() => setMod7(d => ({ ...d, b2bEntries: (d.b2bEntries || []).filter((_, j) => j !== i) }))} className="text-xs text-red-400 hover:text-red-600">Usuń</button>}
              </div>
              <TextField label="Kontrahent" value={entry.kontrahent} onChange={(v) => setMod7(d => { const e = [...(d.b2bEntries || [])]; e[i] = { ...e[i], kontrahent: v }; return { ...d, b2bEntries: e }; })} disabled={!canB2B} />
              <TextField label="Data rozpoczęcia" value={entry.dataRozpoczecia} onChange={(v) => setMod7(d => { const e = [...(d.b2bEntries || [])]; e[i] = { ...e[i], dataRozpoczecia: v }; return { ...d, b2bEntries: e }; })} disabled={!canB2B} type="date" />
              <DropField label="Wypowiedzenie" value={entry.wypowiedzenie} options={B2B_WYP} onChange={(v) => setMod7(d => { const e = [...(d.b2bEntries || [])]; e[i] = { ...e[i], wypowiedzenie: v as never }; return { ...d, b2bEntries: e }; })} disabled={!canB2B} />
              <TextField label="Data wypowiedzenia" value={entry.dataWypowiedzenia} onChange={(v) => setMod7(d => { const e = [...(d.b2bEntries || [])]; e[i] = { ...e[i], dataWypowiedzenia: v }; return { ...d, b2bEntries: e }; })} disabled={!canB2B} type="date" />
            </div>
          ))}
          {(mod7.b2bEntries || []).length === 0 && <p className="text-xs text-gray-400 mb-2">Brak wpisów</p>}
          {canB2B && <button type="button" onClick={() => setMod7(d => ({ ...d, b2bEntries: [...(d.b2bEntries || []), {}] }))} className="text-xs text-blue-600 hover:underline">+ Dodaj umowę B2B</button>}
        </ModuleCard>

        {/* ── Module 8B: Umowy najmu (multi-entry) ── */}
        <ModuleCard
          title="8B. Umowy najmu"
          closed={c.mod7BClosed}
          canEdit={canB2B}
          onToggleClose={() => toggleModuleClosed("mod7BClosed", c.mod7BClosed)}
          onSave={() => saveModule("mod7Umowy", mod7)}
          saving={savingMod === "mod7Umowy"}
        >
          {(mod7.najmEntries || []).map((entry, i) => (
            <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-400">Najem #{i + 1}</span>
                {canB2B && <button type="button" onClick={() => setMod7(d => ({ ...d, najmEntries: (d.najmEntries || []).filter((_, j) => j !== i) }))} className="text-xs text-red-400 hover:text-red-600">Usuń</button>}
              </div>
              <TextField label="Umowa najmu" value={entry.umowa} onChange={(v) => setMod7(d => { const e = [...(d.najmEntries || [])]; e[i] = { ...e[i], umowa: v }; return { ...d, najmEntries: e }; })} disabled={!canB2B} />
              <TextField label="Data rozpoczęcia" value={entry.dataRozpoczecia} onChange={(v) => setMod7(d => { const e = [...(d.najmEntries || [])]; e[i] = { ...e[i], dataRozpoczecia: v }; return { ...d, najmEntries: e }; })} disabled={!canB2B} type="date" />
              <DropField label="Wypowiedzenie" value={entry.wypowiedzenie} options={B2B_WYP} onChange={(v) => setMod7(d => { const e = [...(d.najmEntries || [])]; e[i] = { ...e[i], wypowiedzenie: v as never }; return { ...d, najmEntries: e }; })} disabled={!canB2B} />
              <TextField label="Data wypowiedzenia" value={entry.dataWypowiedzenia} onChange={(v) => setMod7(d => { const e = [...(d.najmEntries || [])]; e[i] = { ...e[i], dataWypowiedzenia: v }; return { ...d, najmEntries: e }; })} disabled={!canB2B} type="date" />
            </div>
          ))}
          {(mod7.najmEntries || []).length === 0 && <p className="text-xs text-gray-400 mb-2">Brak wpisów</p>}
          {canB2B && <button type="button" onClick={() => setMod7(d => ({ ...d, najmEntries: [...(d.najmEntries || []), {}] }))} className="text-xs text-blue-600 hover:underline">+ Dodaj umowę najmu</button>}
        </ModuleCard>

        {/* ── Module 9: Inne (multi-entry) ── */}
        <ModuleCard
          title="9. Inne"
          closed={c.mod8Closed}
          canEdit={canMod8}
          onToggleClose={() => c.mod8Closed ? toggleModuleClosed("mod8Closed", true) : closeModuleWithCascade("mod8Closed", ["mod8AClosed", "mod8BClosed"])}
          isAdmin={isAdminOrSupervisor}
          subModulesOpen={[...(!c.mod8AClosed ? ["9A"] : []), ...(!c.mod8BClosed ? ["9B"] : [])]}
          onSave={() => saveModule("mod8Inne", mod8)}
          saving={savingMod === "mod8Inne"}
        >
          <SubModuleHeader title="9A — Bramki płatności" closed={c.mod8AClosed} canEdit={canMod8} onToggle={() => toggleModuleClosed("mod8AClosed", c.mod8AClosed)} />
          {(mod8.bramkiEntries || []).map((entry, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Bramka #{i + 1}</span>
                {canMod8 && <button type="button" onClick={() => setMod8(d => ({ ...d, bramkiEntries: (d.bramkiEntries || []).filter((_, j) => j !== i) }))} className="text-xs text-red-400 hover:text-red-600">Usuń</button>}
              </div>
              <DropField label="Rodzaj" value={entry.rodzaj} options={BRAMKI_RODZAJ} onChange={(v) => setMod8(d => { const e = [...(d.bramkiEntries || [])]; e[i] = { ...e[i], rodzaj: v as never }; return { ...d, bramkiEntries: e }; })} disabled={!canMod8} />
              <DropField label="Status" value={entry.status} options={BRAMKI_STATUS} onChange={(v) => setMod8(d => { const e = [...(d.bramkiEntries || [])]; e[i] = { ...e[i], status: v as never }; return { ...d, bramkiEntries: e }; })} disabled={!canMod8} />
            </div>
          ))}
          {(mod8.bramkiEntries || []).length === 0 && <p className="text-xs text-gray-400 mb-1">Brak wpisów</p>}
          {canMod8 && <button type="button" onClick={() => setMod8(d => ({ ...d, bramkiEntries: [...(d.bramkiEntries || []), {}] }))} className="text-xs text-blue-600 hover:underline mb-3 block">+ Dodaj bramkę</button>}

          <SubModuleHeader title="9B — Domena/Hosting" closed={c.mod8BClosed} canEdit={canMod8} onToggle={() => toggleModuleClosed("mod8BClosed", c.mod8BClosed)} />
          {(mod8.domenaEntries || []).map((entry, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Domena #{i + 1}</span>
                {canMod8 && <button type="button" onClick={() => setMod8(d => ({ ...d, domenaEntries: (d.domenaEntries || []).filter((_, j) => j !== i) }))} className="text-xs text-red-400 hover:text-red-600">Usuń</button>}
              </div>
              <DropField label="Cesja" value={entry.rodzaj} options={DOMENA_RODZAJ} onChange={(v) => setMod8(d => { const e = [...(d.domenaEntries || [])]; e[i] = { ...e[i], rodzaj: v as never }; return { ...d, domenaEntries: e }; })} disabled={!canMod8} />
              <DropField label="Status" value={entry.status} options={DOMENA_STATUS} onChange={(v) => setMod8(d => { const e = [...(d.domenaEntries || [])]; e[i] = { ...e[i], status: v as never }; return { ...d, domenaEntries: e }; })} disabled={!canMod8} />
            </div>
          ))}
          {(mod8.domenaEntries || []).length === 0 && <p className="text-xs text-gray-400 mb-1">Brak wpisów</p>}
          {canMod8 && <button type="button" onClick={() => setMod8(d => ({ ...d, domenaEntries: [...(d.domenaEntries || []), {}] }))} className="text-xs text-blue-600 hover:underline">+ Dodaj domenę</button>}
        </ModuleCard>

      </div>

      {/* History toggle */}
      <div className="mt-6">
        <button
          onClick={showHistory ? () => setShowHistory(false) : loadHistory}
          className="text-sm text-blue-600 hover:underline"
        >
          {showHistory ? "Ukryj historię" : "Pokaż historię zmian"}
        </button>
        {showHistory && (
          <div className="mt-3 bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">Historia zmian</div>
            {history.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">Brak historii</p>
            ) : (
              <div className="divide-y text-sm max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="px-4 py-2 flex gap-3">
                    <span className="text-gray-400 flex-shrink-0 w-36">
                      {new Date(h.changedAt).toLocaleString("pl-PL")}
                    </span>
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

      {/* Send modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="font-bold text-gray-900 mb-4">Wyślij sprawę</h2>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
                <span className="text-sm font-medium">PILNE</span>
              </label>
              {isUrgent && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                  <select className="w-full border rounded px-3 py-1.5 text-sm" value={urgentLabel} onChange={(e) => setUrgentLabel(e.target.value)}>
                    <option value="1h">1 godzina</option>
                    <option value="2h">2 godziny</option>
                    <option value="3h">3 godziny</option>
                    <option value="1 dzień">1 dzień</option>
                  </select>
                </div>
              )}
              {!isUrgent && <p className="text-xs text-gray-500">Deadline: 2 dni robocze (domyślny)</p>}
            </div>
            {sendResult && <p className="text-sm mb-3 text-blue-700">{sendResult}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sendSaving}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {sendSaving ? "Wysyłanie..." : "Wyślij powiadomienia"}
              </button>
              <button onClick={() => { setSendModal(false); setSendResult(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
