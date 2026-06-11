"use client";

import { useState, useEffect } from "react";
import { CountdownTimer } from "./CountdownTimer";
import { CloseModal } from "./CloseModal";

const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry", ADMINISTRACJA: "Administracja", KONTAKT: "Kontakt", HR: "HR",
  KSIEGOWOSC: "Księgowość", B2B: "B2B", OPLATY: "Opłaty", TUTLO: "Tutlo", INNY: "Inny",
};
const CHANNEL_LABELS: Record<string, string> = { PHONE: "Telefon", EMAIL: "E-mail", SMS: "SMS" };
const STATUS_LABELS: Record<string, string> = {
  ZGLOSZONA: "Zgłoszona", PRZYJETA: "Przyjęta", KONTAKT_WSTEPNY: "Kontakt wstępny wysłany",
  W_TOKU: "W toku", PRZEDLUZONO: "Przedłużono", ZAMKNIETE: "Zamknięte",
  NOWE: "Nowe", OCZEKUJE_NA_DEADLINE: "Oczekuje na deadline",
};
const STATUS_COLORS: Record<string, string> = {
  ZGLOSZONA: "bg-purple-100 text-purple-800", PRZYJETA: "bg-blue-100 text-blue-800",
  KONTAKT_WSTEPNY: "bg-cyan-100 text-cyan-800", W_TOKU: "bg-yellow-100 text-yellow-800",
  PRZEDLUZONO: "bg-orange-100 text-orange-800", ZAMKNIETE: "bg-gray-100 text-gray-800",
  NOWE: "bg-blue-100 text-blue-800", OCZEKUJE_NA_DEADLINE: "bg-purple-100 text-purple-800",
};
const LANG_LABELS: Record<string, string> = { PL: "🇵🇱", EN: "🇬🇧", RU: "🇷🇺" };

interface CaseData {
  id: string; createdAt: string; channel: string; taker: string; takerId: string | null;
  client: string; topic: string; dept: string; owner: string | null; ownerId: string | null;
  salutation: string; language: string; responseTime: number | null;
  acceptedAt: string | null; acceptedBy: string | null;
  deadline: string | null; deadlineSetAt: string | null; deadlineSetBy: string | null;
  status: string; extended: boolean;
  firstContactAt: string | null; firstContactSentAt: string | null;
  extensionSentAt: string | null; closedAt: string | null; note: string | null;
}

interface WorkerOption { id: string; name: string; dept: string | null; gender: string; position: string | null; }
interface SettingsData { signatureTemplate?: string | null; timeFormatRelative?: boolean; }
interface HistoryEntry { id: string; changedBy: string; changedAt: string; field: string; oldValue: string | null; newValue: string | null; }

interface CaseCardProps {
  caseData: CaseData;
  bccEmail: string;
  settings: SettingsData;
  onRefresh: () => void;
}

export function CaseCard({ caseData, bccEmail, settings, onRefresh }: CaseCardProps) {
  const [loading, setLoading] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [showOwnerChange, setShowOwnerChange] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<{ id: string; fullName: string; gender: string; position: string | null; signatureBlock: string | null } | null>(null);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser).catch(() => {});
  }, []);

  const isZgloszona = caseData.status === "ZGLOSZONA" || caseData.status === "OCZEKUJE_NA_DEADLINE";
  const isPrzyjeta = caseData.status === "PRZYJETA" || caseData.status === "NOWE";
  const hasDeadline = !!caseData.deadline;
  const deadlineDate = caseData.deadline ? new Date(caseData.deadline) : null;
  const isOverdue = deadlineDate ? deadlineDate < new Date() : false;
  const isClosed = caseData.status === "ZAMKNIETE";
  const useRelative = settings.timeFormatRelative !== false;

  function generateFirstContactBody(): string {
    if (!user) return "";
    const sal = caseData.salutation as "PAN" | "PANI";
    const lang = caseData.language;
    const gender = user.gender;
    const rt = caseData.responseTime || 1;

    // Compute deadline time for absolute format
    const deadlineTime = deadlineDate
      ? deadlineDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })
      : "";

    let body = "";
    if (lang === "PL") {
      const salut = sal === "PANI" ? "Pani" : "Pana";
      const busy = gender === "K" ? "zajęta" : "zajęty";
      const grateful = gender === "K" ? "wdzięczna" : "wdzięczny";
      const time = useRelative
        ? `— ${rt === 1 ? "w ciągu około 1 godziny" : `w ciągu około ${rt} godzin`}.`
        : `— najpóźniej do godziny ${deadlineTime}.`;
      body = `Dzień dobry,\n\nDziękuję za wiadomość. W tym momencie jestem ${busy}, ale zajmę się ${salut} sprawą tak szybko, jak to możliwe ${time}\n\nDziękuję i będę ${grateful} za cierpliwość.`;
    } else if (lang === "EN") {
      const salut = sal === "PANI" ? "Madam" : "Sir";
      const time = useRelative
        ? `— within approximately ${rt === 1 ? "1 hour" : `${rt} hours`}.`
        : `— no later than ${deadlineTime}.`;
      body = `Dear ${salut},\n\nThank you for your message. I am currently occupied, but I will attend to your matter as soon as possible ${time}\n\nThank you for your patience.`;
    } else {
      const busy = gender === "K" ? "занята" : "занят";
      const time = useRelative
        ? `— ${rt === 1 ? "в течение примерно 1 часа" : `в течение примерно ${rt} часов`}.`
        : `— не позднее ${deadlineTime}.`;
      body = `Здравствуйте,\n\nСпасибо за Ваше сообщение. В данный момент я ${busy}, но займусь Вашим вопросом как можно скорее ${time}\n\nБлагодарю за терпение.`;
    }

    // Signature
    const regards = lang === "EN" ? "Best regards," : lang === "RU" ? "С уважением," : "Z pozdrowieniami,";
    if (user.signatureBlock) {
      body += `\n\n${user.signatureBlock}`;
    } else if (settings.signatureTemplate) {
      body += `\n\n${settings.signatureTemplate
        .replace(/\{regards\}/g, regards)
        .replace(/\{fullName\}/g, user.fullName)
        .replace(/\{position\}/g, user.position || "")
        .replace(/\n{3,}/g, "\n\n")}`;
    } else {
      body += `\n\n${regards}\n\n${user.fullName}`;
      if (user.position) body += `\n${user.position}`;
      body += `\n\nFundacja Firma Dla Każdego\n\nul. Lwowska 17/4\n00-660 Warszawa\nNIP: 5252625624\n\nwww.firmadlakazdego.pl`;
    }
    return body;
  }

  function generateExtensionBody(): string {
    if (!deadlineDate || !user) return "";
    const newDeadline = new Date(deadlineDate.getTime() + 60 * 60 * 1000);
    const deadlineStr = newDeadline.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
    const sal = caseData.salutation as "PAN" | "PANI";
    const lang = caseData.language;

    let body = "";
    if (lang === "PL") {
      const salut = sal === "PANI" ? "Pani" : "Pana";
      const salut2 = sal === "PANI" ? "Pani" : "Pan";
      body = `Dzień dobry,\n\nW nawiązaniu do wcześniejszej wiadomości — ${salut} sprawa wymaga nieco więcej czasu. Odpowiedź otrzyma ${salut2} najpóźniej do godziny ${deadlineStr}.\n\nPrzepraszam za opóźnienie i dziękuję za cierpliwość.`;
    } else if (lang === "EN") {
      const salut = sal === "PANI" ? "Madam" : "Sir";
      body = `Dear ${salut},\n\nFollowing up on my previous message — your matter requires a bit more time. You will receive a response no later than ${deadlineStr}.\n\nI apologize for the delay and thank you for your patience.`;
    } else {
      body = `Здравствуйте,\n\nВ продолжение моего предыдущего сообщения — Ваш вопрос требует немного больше времени. Вы получите ответ не позднее ${deadlineStr}.\n\nПрошу прощения за задержку и благодарю за терпение.`;
    }

    const regards = lang === "EN" ? "Best regards," : lang === "RU" ? "С уважением," : "Z pozdrowieniami,";
    if (user.signatureBlock) {
      body += `\n\n${user.signatureBlock}`;
    } else if (settings.signatureTemplate) {
      body += `\n\n${settings.signatureTemplate.replace(/\{regards\}/g, regards).replace(/\{fullName\}/g, user.fullName).replace(/\{position\}/g, user.position || "").replace(/\n{3,}/g, "\n\n")}`;
    } else {
      body += `\n\n${regards}\n\n${user.fullName}`;
      if (user.position) body += `\n${user.position}`;
      body += `\n\nFundacja Firma Dla Każdego\n\nul. Lwowska 17/4\n00-660 Warszawa\nNIP: 5252625624\n\nwww.firmadlakazdego.pl`;
    }
    return body;
  }

  function openMailto(bodyText: string) {
    const subject = encodeURIComponent(`Re: ${caseData.topic}`);
    const body = encodeURIComponent(bodyText);
    const bcc = encodeURIComponent(bccEmail);
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, "_self");
  }

  async function apiCall(url: string, method = "POST", bodyData?: unknown) {
    const res = await fetch(url, {
      method,
      headers: bodyData ? { "Content-Type": "application/json" } : undefined,
      body: bodyData ? JSON.stringify(bodyData) : undefined,
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Błąd");
      return false;
    }
    return true;
  }

  async function handleAction(key: string, url: string, bodyData?: unknown) {
    setLoading(key);
    try {
      if (await apiCall(url, "POST", bodyData)) onRefresh();
    } finally {
      setLoading("");
    }
  }

  async function handleUndo(action: string) {
    setLoading(`undo-${action}`);
    try {
      if (await apiCall(`/api/cases/${caseData.id}/undo`, "POST", { action })) onRefresh();
    } finally {
      setLoading("");
    }
  }

  async function loadHistory() {
    setShowHistory(!showHistory);
    if (!showHistory) {
      const res = await fetch(`/api/cases/${caseData.id}/history`);
      if (res.ok) setHistory(await res.json());
    }
  }

  // Border colors
  let borderColor = "border-l-gray-300";
  if (isZgloszona) borderColor = "border-l-purple-500";
  else if (isPrzyjeta) borderColor = "border-l-blue-500";
  else if (isOverdue) borderColor = "border-l-red-500";
  else if (deadlineDate && deadlineDate.getTime() - Date.now() < 30 * 60 * 1000) borderColor = "border-l-yellow-500";
  else if (hasDeadline) borderColor = "border-l-green-500";

  const wrapperClass = isZgloszona
    ? "bg-white rounded-lg shadow-sm border-2 border-purple-300 border-l-4 border-l-purple-500 p-4 space-y-3"
    : `bg-white rounded-lg shadow-sm border border-l-4 ${borderColor} p-4 space-y-3`;

  return (
    <>
      <div className={wrapperClass}>
        {isZgloszona && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800 font-medium">
            📋 Zgłoszona — oczekuje na przyjęcie
          </div>
        )}
        {isPrzyjeta && !caseData.firstContactSentAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 font-medium">
            ✔ Przyjęta — czas reakcji: {caseData.responseTime}h — wyślij kontakt wstępny, aby uruchomić odliczanie
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-bold text-lg">
              {caseData.client}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {caseData.salutation === "PANI" ? "Pani" : "Pan"} {LANG_LABELS[caseData.language] || ""}
              </span>
            </h3>
            <p className="text-gray-600 text-sm">{caseData.topic}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap self-start ${STATUS_COLORS[caseData.status] || "bg-gray-100"}`}>
            {STATUS_LABELS[caseData.status] || caseData.status}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><span className="text-gray-500">Dział:</span> {DEPT_LABELS[caseData.dept] || caseData.dept}{caseData.owner && ` → ${caseData.owner}`}</div>
          <div><span className="text-gray-500">Kanał:</span> {CHANNEL_LABELS[caseData.channel] || caseData.channel}</div>
          <div><span className="text-gray-500">Zgłosił/a:</span> {caseData.taker}, {new Date(caseData.createdAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</div>
        </div>

        {/* Deadline / Response time info */}
        {hasDeadline && deadlineDate && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Deadline:</span>
            <CountdownTimer deadline={caseData.deadline!} />
            <span className="text-gray-400">({deadlineDate.toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" })})</span>
            {caseData.extended && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">+1h</span>}
          </div>
        )}
        {!hasDeadline && caseData.responseTime && (
          <div className="text-sm text-gray-500">
            Czas reakcji: <strong>{caseData.responseTime}h</strong> — start po wysłaniu kontaktu wstępnego
          </div>
        )}

        {/* Accept form */}
        {isZgloszona && showAcceptForm && (
          <AcceptForm caseId={caseData.id} currentOwner={caseData.owner} currentUserId={user?.id || ""} currentUserName={user?.fullName || ""} onDone={() => { setShowAcceptForm(false); onRefresh(); }} onCancel={() => setShowAcceptForm(false)} />
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Accept */}
          {isZgloszona && !showAcceptForm && (
            <button onClick={() => setShowAcceptForm(true)} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
              ✔ Przyjmij zgłoszenie
            </button>
          )}

          {/* Undo accept */}
          {isPrzyjeta && !caseData.firstContactSentAt && (
            <button onClick={() => handleUndo("accept")} disabled={loading === "undo-accept"} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50">
              ↩ Cofnij przyjęcie
            </button>
          )}

          {/* First Contact: open template + mark sent */}
          {(isPrzyjeta || caseData.status === "KONTAKT_WSTEPNY" || hasDeadline) && !caseData.firstContactSentAt && !isZgloszona && (
            <>
              <button onClick={() => openMailto(generateFirstContactBody())} className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700">
                📧 Otwórz szablon
              </button>
              <button onClick={() => handleAction("markContact", `/api/cases/${caseData.id}/first-contact`)} disabled={loading === "markContact"} className="px-3 py-1.5 text-sm bg-cyan-800 text-white rounded hover:bg-cyan-900 disabled:opacity-50">
                {loading === "markContact" ? "..." : "✓ Oznacz jako wysłany"}
              </button>
            </>
          )}
          {caseData.firstContactSentAt && (
            <>
              <span className="px-3 py-1.5 text-sm bg-cyan-50 text-cyan-700 rounded border border-cyan-200">✓ Kontakt wysłany</span>
              {!isClosed && (
                <button onClick={() => handleUndo("firstContact")} disabled={loading === "undo-firstContact"} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50">
                  ↩ Cofnij
                </button>
              )}
            </>
          )}

          {/* Extend */}
          {hasDeadline && !caseData.extended && !isClosed && (
            <button onClick={() => handleAction("extend", `/api/cases/${caseData.id}/extend`)} disabled={loading === "extend"} className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">+1h</button>
          )}

          {/* Extension message */}
          {caseData.extended && !caseData.extensionSentAt && !isClosed && (
            <>
              <button onClick={() => openMailto(generateExtensionBody())} className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">📧 Szablon przedłużenia</button>
              <button onClick={() => handleAction("markExtension", `/api/cases/${caseData.id}/mark-extension-sent`)} disabled={loading === "markExtension"} className="px-3 py-1.5 text-sm bg-orange-800 text-white rounded hover:bg-orange-900 disabled:opacity-50">
                {loading === "markExtension" ? "..." : "✓ Oznacz wysłanie"}
              </button>
            </>
          )}
          {caseData.extensionSentAt && <span className="px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded border border-orange-200">✓ Przedłużenie wysłane</span>}

          {/* Undo extend */}
          {caseData.extended && !isClosed && (
            <button onClick={() => handleUndo("extend")} disabled={loading === "undo-extend"} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50">
              ↩ Cofnij +1h
            </button>
          )}

          {/* Close / Reopen */}
          {!isClosed && (
            <button onClick={() => setShowCloseModal(true)} disabled={loading === "close"} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              ✅ Odpowiedź udzielona
            </button>
          )}
          {isClosed && (
            <button onClick={() => handleUndo("close")} disabled={loading === "undo-close"} className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50">
              🔄 Otwórz ponownie
            </button>
          )}

          {/* Edit / Change Owner / History */}
          {!isClosed && (
            <>
              <button onClick={() => setShowEdit(!showEdit)} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">✏️ Edycja</button>
              <button onClick={() => { setShowOwnerChange(!showOwnerChange); if (!showOwnerChange && workers.length === 0) fetch("/api/settings/workers").then((r) => r.json()).then((d) => setWorkers(Array.isArray(d) ? d : [])).catch(() => {}); }} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">🔄 Zmień odpowiedzialnego</button>
            </>
          )}
          <button onClick={loadHistory} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200">📜 Historia</button>
        </div>

        {/* Inline edit */}
        {showEdit && <EditForm caseData={caseData} onSave={async (data) => { if (await apiCall(`/api/cases/${caseData.id}`, "PATCH", data)) { setShowEdit(false); onRefresh(); } }} onCancel={() => setShowEdit(false)} />}

        {/* Owner change */}
        {showOwnerChange && <OwnerChangeForm caseId={caseData.id} currentOwner={caseData.owner} workers={workers.sort((a, b) => a.name.localeCompare(b.name, "pl"))} onDone={() => { setShowOwnerChange(false); onRefresh(); }} onCancel={() => setShowOwnerChange(false)} />}

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            <h4 className="text-xs font-medium text-gray-500">Historia zmian</h4>
            {history.map((h) => (
              <div key={h.id} className="text-xs text-gray-500">
                <span className="font-medium">{h.changedBy}</span> — {h.field}: {h.oldValue} → {h.newValue}
                <span className="ml-2 text-gray-400">{new Date(h.changedAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCloseModal && (
        <CloseModal onClose={() => setShowCloseModal(false)} onSubmit={async (note) => { setLoading("close"); try { if (await apiCall(`/api/cases/${caseData.id}/close`, "POST", { note })) { setShowCloseModal(false); onRefresh(); } } finally { setLoading(""); } }} loading={loading === "close"} />
      )}
    </>
  );
}

function AcceptForm({ caseId, currentOwner, currentUserId, currentUserName, onDone, onCancel }: {
  caseId: string; currentOwner: string | null; currentUserId: string; currentUserName: string;
  onDone: () => void; onCancel: () => void;
}) {
  const [responseTime, setResponseTime] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ownerDiffers = currentOwner && currentOwner !== currentUserName;

  async function handleSubmit() {
    if (ownerDiffers && !confirm(`Sprawa wskazana dla ${currentOwner}. Przyjmując, przejmujesz odpowiedzialność. Kontynuować?`)) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responseTime }) });
      if (res.ok) onDone();
      else { const data = await res.json(); setError(data.error || "Błąd"); }
    } catch { setError("Błąd połączenia"); } finally { setLoading(false); }
  }

  return (
    <div className="border-t pt-3 space-y-2 bg-purple-50 rounded-lg p-3">
      <h4 className="font-medium text-sm text-purple-800">Przyjmij zgłoszenie — wybierz czas reakcji</h4>
      {ownerDiffers && (
        <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1">
          Sprawa wskazana dla <strong>{currentOwner}</strong>. Przyjmując, przejmujesz odpowiedzialność.
        </p>
      )}
      <div className="flex gap-2">
        {[1, 2, 3].map((h) => (
          <button key={h} type="button" onClick={() => setResponseTime(h)}
            className={`px-4 py-2 rounded text-sm border ${responseTime === h ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
            {h}h
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={loading} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">{loading ? "..." : "Przyjmij"}</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Anuluj</button>
      </div>
    </div>
  );
}

function EditForm({ caseData, onSave, onCancel }: { caseData: { dept: string }; onSave: (data: Record<string, unknown>) => void; onCancel: () => void }) {
  const [dept, setDept] = useState(caseData.dept);
  const sortedDepts = Object.entries(DEPT_LABELS).filter(([k]) => k !== "HR_ENG").sort((a, b) => a[1] === "Inny" ? 1 : b[1] === "Inny" ? -1 : a[1].localeCompare(b[1], "pl"));

  return (
    <div className="border-t pt-3 space-y-2">
      <div>
        <label className="text-xs text-gray-500">Dział</label>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
          {sortedDepts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ dept })} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Zapisz</button>
        <button onClick={onCancel} className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Anuluj</button>
      </div>
    </div>
  );
}

function OwnerChangeForm({ caseId, currentOwner, workers, onDone, onCancel }: { caseId: string; currentOwner: string | null; workers: WorkerOption[]; onDone: () => void; onCancel: () => void }) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const worker = workers.find((w) => w.id === selectedId);
    if (!worker) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/change-owner`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOwnerId: worker.id, newOwnerName: worker.name }) });
      if (res.ok) onDone();
      else { const data = await res.json(); setError(data.error || "Błąd"); }
    } catch { setError("Błąd połączenia"); } finally { setLoading(false); }
  }

  return (
    <div className="border-t pt-3 space-y-2">
      <h4 className="text-sm font-medium">Zmiana odpowiedzialnego {currentOwner && <span className="text-gray-400">(obecnie: {currentOwner})</span>}</h4>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
        <option value="">— wybierz pracownika —</option>
        {workers.map((w) => <option key={w.id} value={w.id}>{w.name} {w.dept ? `(${DEPT_LABELS[w.dept] || w.dept})` : ""}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!selectedId || loading} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{loading ? "..." : "Zmień"}</button>
        <button onClick={onCancel} className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Anuluj</button>
      </div>
    </div>
  );
}
