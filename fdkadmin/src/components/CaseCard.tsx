"use client";

import { useState, useEffect } from "react";
import { CountdownTimer } from "./CountdownTimer";
import { CloseModal } from "./CloseModal";

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Telefon",
  EMAIL: "E-mail",
  SMS: "SMS",
};

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

const STATUS_LABELS: Record<string, string> = {
  NOWE: "Nowe",
  OCZEKUJE_NA_DEADLINE: "⏳ Oczekuje na deadline",
  KONTAKT_WSTEPNY: "Kontakt wstępny wysłany",
  W_TOKU: "W toku",
  PRZEDLUZONO: "Przedłużono",
  ZAMKNIETE: "Zamknięte",
};

const STATUS_COLORS: Record<string, string> = {
  NOWE: "bg-blue-100 text-blue-800",
  OCZEKUJE_NA_DEADLINE: "bg-purple-100 text-purple-800",
  KONTAKT_WSTEPNY: "bg-cyan-100 text-cyan-800",
  W_TOKU: "bg-yellow-100 text-yellow-800",
  PRZEDLUZONO: "bg-orange-100 text-orange-800",
  ZAMKNIETE: "bg-gray-100 text-gray-800",
};

const LANG_LABELS: Record<string, string> = {
  PL: "🇵🇱",
  EN: "🇬🇧",
  RU: "🇷🇺",
};

interface CaseData {
  id: string;
  createdAt: string;
  channel: string;
  taker: string;
  takerId: string | null;
  client: string;
  topic: string;
  dept: string;
  owner: string | null;
  ownerId: string | null;
  salutation: string;
  language: string;
  deadline: string | null;
  deadlineSetAt: string | null;
  deadlineSetBy: string | null;
  status: string;
  extended: boolean;
  firstContactAt: string | null;
  firstContactSentAt: string | null;
  extensionSentAt: string | null;
  closedAt: string | null;
  note: string | null;
}

interface WorkerOption {
  id: string;
  name: string;
  dept: string | null;
  gender: string;
  position: string | null;
}

interface CaseCardProps {
  caseData: CaseData;
  bccEmail: string;
  onRefresh: () => void;
}

export function CaseCard({ caseData, bccEmail, onRefresh }: CaseCardProps) {
  const [loading, setLoading] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [showOwnerChange, setShowOwnerChange] = useState(false);
  const [user, setUser] = useState<{ id: string; fullName: string; gender: string; position: string | null; signatureBlock: string | null } | null>(null);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setUser)
      .catch(() => {});
  }, []);

  const isWaitingDeadline = caseData.status === "OCZEKUJE_NA_DEADLINE";
  const hasDeadline = !!caseData.deadline;
  const deadlineDate = caseData.deadline ? new Date(caseData.deadline) : null;
  const isOverdue = deadlineDate ? deadlineDate < new Date() : false;

  function generateFirstContactBody(): string {
    if (!deadlineDate || !user) return "";

    const deadlineStr = deadlineDate.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });

    const sal = caseData.salutation;
    const lang = caseData.language;
    const gender = user.gender;

    let body = "";
    if (lang === "PL") {
      const salut = sal === "PANI" ? "Pani" : "Pana";
      const busy = gender === "K" ? "zajęta" : "zajęty";
      const grateful = gender === "K" ? "wdzięczna" : "wdzięczny";
      body = `Dzień dobry,\n\nDziękuję za wiadomość. W tym momencie jestem ${busy}, ale zajmę się ${salut} sprawą tak szybko, jak to możliwe — najpóźniej do godziny ${deadlineStr}.\n\nDziękuję i będę ${grateful} za cierpliwość.`;
    } else if (lang === "EN") {
      const salut = sal === "PANI" ? "Madam" : "Sir";
      body = `Dear ${salut},\n\nThank you for your message. I am currently occupied, but I will attend to your matter as soon as possible — no later than ${deadlineStr}.\n\nThank you for your patience.`;
    } else {
      const busy = gender === "K" ? "занята" : "занят";
      body = `Здравствуйте,\n\nСпасибо за Ваше сообщение. В данный момент я ${busy}, но займусь Вашим вопросом как можно скорее — не позднее ${deadlineStr}.\n\nБлагодарю за терпение.`;
    }

    // Add signature
    const regards = lang === "EN" ? "Best regards," : lang === "RU" ? "С уважением," : "Z pozdrowieniami,";
    if (user.signatureBlock) {
      body += `\n\n${user.signatureBlock}`;
    } else {
      body += `\n\n${regards}\n${user.fullName}`;
      if (user.position) body += `\n${user.position}`;
      body += `\n\nFundacja Firma Dla Każdego\nul. Lwowska 17/4, 00-660 Warszawa\nwww.firmadlakazdego.pl`;
    }

    return body;
  }

  function generateExtensionBody(): string {
    if (!deadlineDate || !user) return "";

    const newDeadline = new Date(deadlineDate.getTime() + 60 * 60 * 1000);
    const deadlineStr = newDeadline.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });

    const sal = caseData.salutation;
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
    } else {
      body += `\n\n${regards}\n${user.fullName}`;
      if (user.position) body += `\n${user.position}`;
      body += `\n\nFundacja Firma Dla Każdego\nul. Lwowska 17/4, 00-660 Warszawa\nwww.firmadlakazdego.pl`;
    }

    return body;
  }

  function openFirstContactMailto() {
    const body = generateFirstContactBody();
    const subject = encodeURIComponent(`Re: ${caseData.topic}`);
    const encodedBody = encodeURIComponent(body);
    const bcc = encodeURIComponent(bccEmail);
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${encodedBody}`, "_self");
  }

  async function handleMarkFirstContactSent() {
    setLoading("markContact");
    try {
      const res = await fetch(`/api/cases/${caseData.id}/first-contact`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Błąd");
        return;
      }
      onRefresh();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading("");
    }
  }

  function openExtensionMailto() {
    const body = generateExtensionBody();
    const subject = encodeURIComponent(`Re: ${caseData.topic}`);
    const encodedBody = encodeURIComponent(body);
    const bcc = encodeURIComponent(bccEmail);
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${encodedBody}`, "_self");
  }

  async function handleMarkExtensionSent() {
    setLoading("markExtension");
    try {
      const res = await fetch(`/api/cases/${caseData.id}/mark-extension-sent`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Błąd");
        return;
      }
      onRefresh();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading("");
    }
  }

  async function handleExtend() {
    if (caseData.extended) return;
    setLoading("extend");
    try {
      const res = await fetch(`/api/cases/${caseData.id}/extend`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Błąd przedłużenia");
        return;
      }
      onRefresh();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading("");
    }
  }

  async function handleClose(note: string) {
    setLoading("close");
    try {
      const res = await fetch(`/api/cases/${caseData.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Błąd zamykania");
        return;
      }
      setShowCloseModal(false);
      onRefresh();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading("");
    }
  }

  async function handleEditSave(data: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/cases/${caseData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowEdit(false);
        onRefresh();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  // Border colors
  let borderColor = "border-l-gray-300";
  if (isWaitingDeadline) {
    borderColor = "border-l-purple-500";
  } else if (isOverdue) {
    borderColor = "border-l-red-500";
  } else if (deadlineDate && deadlineDate.getTime() - Date.now() < 30 * 60 * 1000) {
    borderColor = "border-l-yellow-500";
  } else if (hasDeadline) {
    borderColor = "border-l-green-500";
  }

  const wrapperClass = isWaitingDeadline
    ? "bg-white rounded-lg shadow-sm border-2 border-purple-300 border-l-4 border-l-purple-500 p-4 space-y-3"
    : `bg-white rounded-lg shadow-sm border border-l-4 ${borderColor} p-4 space-y-3`;

  return (
    <>
      <div className={wrapperClass}>
        {/* Waiting for deadline banner */}
        {isWaitingDeadline && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800 font-medium">
            ⏳ Bez deadline&apos;u — wyznacz deadline!
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
          <span
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap self-start ${STATUS_COLORS[caseData.status] || "bg-gray-100"}`}
          >
            {STATUS_LABELS[caseData.status] || caseData.status}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Dział:</span>{" "}
            {DEPT_LABELS[caseData.dept] || caseData.dept}
            {caseData.owner && ` → ${caseData.owner}`}
          </div>
          <div>
            <span className="text-gray-500">Kanał:</span>{" "}
            {CHANNEL_LABELS[caseData.channel] || caseData.channel}
          </div>
          <div>
            <span className="text-gray-500">Przyjął/a:</span> {caseData.taker},{" "}
            {new Date(caseData.createdAt).toLocaleString("pl-PL", {
              timeZone: "Europe/Warsaw",
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        </div>

        {/* Deadline countdown (only if deadline set) */}
        {hasDeadline && deadlineDate && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Deadline:</span>
            <CountdownTimer deadline={caseData.deadline!} />
            <span className="text-gray-400">
              ({deadlineDate.toLocaleTimeString("pl-PL", {
                timeZone: "Europe/Warsaw",
                hour: "2-digit",
                minute: "2-digit",
              })})
            </span>
            {caseData.extended && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                +1h
              </span>
            )}
            {caseData.deadlineSetBy && (
              <span className="text-xs text-gray-400">
                wyzn. {caseData.deadlineSetBy}
              </span>
            )}
          </div>
        )}

        {/* Set Deadline Form */}
        {isWaitingDeadline && showDeadlineForm && (
          <DeadlineForm
            caseId={caseData.id}
            onDone={() => { setShowDeadlineForm(false); onRefresh(); }}
            onCancel={() => setShowDeadlineForm(false)}
          />
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Set Deadline button */}
          {isWaitingDeadline && !showDeadlineForm && (
            <button
              onClick={() => setShowDeadlineForm(true)}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              ⏰ Wyznacz deadline
            </button>
          )}

          {/* First Contact: two steps */}
          {hasDeadline && !caseData.firstContactSentAt && (
            <>
              <button
                onClick={openFirstContactMailto}
                className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700"
              >
                📧 Otwórz szablon
              </button>
              <button
                onClick={handleMarkFirstContactSent}
                disabled={loading === "markContact"}
                className="px-3 py-1.5 text-sm bg-cyan-800 text-white rounded hover:bg-cyan-900 disabled:opacity-50"
              >
                {loading === "markContact" ? "..." : "✓ Oznacz jako wysłany"}
              </button>
            </>
          )}
          {caseData.firstContactSentAt && (
            <span className="px-3 py-1.5 text-sm bg-cyan-50 text-cyan-700 rounded border border-cyan-200">
              ✓ Kontakt wysłany
            </span>
          )}

          {/* Extend */}
          {hasDeadline && !caseData.extended && (
            <button
              onClick={handleExtend}
              disabled={loading === "extend"}
              className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              +1h
            </button>
          )}

          {/* Extension message: two steps (only after extend) */}
          {caseData.extended && !caseData.extensionSentAt && (
            <>
              <button
                onClick={openExtensionMailto}
                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                📧 Szablon przedłużenia
              </button>
              <button
                onClick={handleMarkExtensionSent}
                disabled={loading === "markExtension"}
                className="px-3 py-1.5 text-sm bg-orange-800 text-white rounded hover:bg-orange-900 disabled:opacity-50"
              >
                {loading === "markExtension" ? "..." : "✓ Oznacz wysłanie"}
              </button>
            </>
          )}
          {caseData.extensionSentAt && (
            <span className="px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded border border-orange-200">
              ✓ Przedłużenie wysłane
            </span>
          )}
          {caseData.extended && (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded self-center">
              Przedłużono
            </span>
          )}

          {/* Close */}
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={loading === "close"}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            ✅ Odpowiedź udzielona
          </button>

          {/* Edit / Change Owner */}
          <button
            onClick={() => setShowEdit(!showEdit)}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ✏️ Edycja
          </button>
          <button
            onClick={() => {
              setShowOwnerChange(!showOwnerChange);
              if (!showOwnerChange && workers.length === 0) {
                fetch("/api/settings/workers")
                  .then((r) => r.json())
                  .then((data) => setWorkers(Array.isArray(data) ? data : []))
                  .catch(() => {});
              }
            }}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            🔄 Zmień odpowiedzialnego
          </button>
        </div>

        {/* Inline Edit */}
        {showEdit && (
          <EditForm
            caseData={caseData}
            onSave={handleEditSave}
            onCancel={() => setShowEdit(false)}
          />
        )}

        {/* Change Owner */}
        {showOwnerChange && (
          <OwnerChangeForm
            caseId={caseData.id}
            currentOwner={caseData.owner}
            workers={workers}
            onDone={() => { setShowOwnerChange(false); onRefresh(); }}
            onCancel={() => setShowOwnerChange(false)}
          />
        )}
      </div>

      {showCloseModal && (
        <CloseModal
          onClose={() => setShowCloseModal(false)}
          onSubmit={handleClose}
          loading={loading === "close"}
        />
      )}
    </>
  );
}

function DeadlineForm({
  caseId,
  onDone,
  onCancel,
}: {
  caseId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [deadlineOffset, setDeadlineOffset] = useState(1);
  const [customDeadline, setCustomDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function getDeadlineDate(): Date {
    if (customDeadline) return new Date(customDeadline);
    return new Date(Date.now() + deadlineOffset * 60 * 60 * 1000);
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/set-deadline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: getDeadlineDate().toISOString() }),
      });
      if (res.ok) {
        onDone();
      } else {
        const data = await res.json();
        setError(data.error || "Błąd");
      }
    } catch {
      setError("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  }

  const preview = getDeadlineDate().toLocaleTimeString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border-t pt-3 space-y-2 bg-purple-50 rounded-lg p-3">
      <h4 className="font-medium text-sm text-purple-800">Wyznacz deadline</h4>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => { setDeadlineOffset(h); setCustomDeadline(""); }}
            className={`px-3 py-1.5 rounded text-sm border ${
              deadlineOffset === h && !customDeadline
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            +{h}h
          </button>
        ))}
        <input
          type="datetime-local"
          value={customDeadline}
          onChange={(e) => { setCustomDeadline(e.target.value); setDeadlineOffset(0); }}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
      <p className="text-xs text-gray-500">Deadline: <strong>{preview}</strong></p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "..." : "Zatwierdź deadline"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

function EditForm({
  caseData,
  onSave,
  onCancel,
}: {
  caseData: { dept: string };
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [dept, setDept] = useState(caseData.dept);

  return (
    <div className="border-t pt-3 space-y-2">
      <div>
        <label className="text-xs text-gray-500">Dział</label>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {Object.entries(DEPT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ dept })}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Zapisz
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

function OwnerChangeForm({
  caseId,
  currentOwner,
  workers,
  onDone,
  onCancel,
}: {
  caseId: string;
  currentOwner: string | null;
  workers: WorkerOption[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const worker = workers.find((w) => w.id === selectedId);
    if (!worker) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/change-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newOwnerId: worker.id,
          newOwnerName: worker.name,
        }),
      });
      if (res.ok) {
        onDone();
      } else {
        const data = await res.json();
        setError(data.error || "Błąd");
      }
    } catch {
      setError("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t pt-3 space-y-2">
      <h4 className="text-sm font-medium">
        Zmiana odpowiedzialnego {currentOwner && <span className="text-gray-400">(obecnie: {currentOwner})</span>}
      </h4>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full border rounded px-2 py-1 text-sm"
      >
        <option value="">— wybierz pracownika —</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} {w.dept ? `(${DEPT_LABELS[w.dept] || w.dept})` : ""}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!selectedId || loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Zmień"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
