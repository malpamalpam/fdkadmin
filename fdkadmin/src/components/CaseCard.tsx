"use client";

import { useState } from "react";
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
  HR_ENG: "HR ENG",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

const STATUS_LABELS: Record<string, string> = {
  NOWE: "Nowe",
  KONTAKT_WSTEPNY: "Kontakt wstępny wysłany",
  W_TOKU: "W toku",
  PRZEDLUZONO: "Przedłużono",
  ZAMKNIETE: "Zamknięte",
};

const STATUS_COLORS: Record<string, string> = {
  NOWE: "bg-blue-100 text-blue-800",
  KONTAKT_WSTEPNY: "bg-cyan-100 text-cyan-800",
  W_TOKU: "bg-yellow-100 text-yellow-800",
  PRZEDLUZONO: "bg-orange-100 text-orange-800",
  ZAMKNIETE: "bg-gray-100 text-gray-800",
};

interface CaseData {
  id: string;
  createdAt: string;
  channel: string;
  taker: string;
  client: string;
  topic: string;
  dept: string;
  owner: string | null;
  deadline: string;
  status: string;
  extended: boolean;
  firstContactAt: string | null;
  closedAt: string | null;
  note: string | null;
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

  const deadlineDate = new Date(caseData.deadline);
  const isOverdue = deadlineDate < new Date();

  async function handleFirstContact() {
    setLoading("contact");
    try {
      // Build mailto link
      const deadlineStr = deadlineDate.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Warsaw",
      });

      const subject = encodeURIComponent(`Re: ${caseData.topic}`);
      const body = encodeURIComponent(
        `Dzień dobry,\n\nDziękuję za wiadomość. W tym momencie jestem zajęta/-y, ale zajmę się Pana/Pani sprawą tak szybko, jak to możliwe — najpóźniej do godziny ${deadlineStr}.\n\nDziękuję i będę wdzięczna/-y za cierpliwość.`
      );
      const bcc = encodeURIComponent(bccEmail);

      window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, "_self");

      // Mark first contact in API
      await fetch(`/api/cases/${caseData.id}/first-contact`, {
        method: "POST",
      });
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

  async function handleEditSave(data: Partial<CaseData>) {
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

  const borderColor = isOverdue
    ? "border-l-red-500"
    : new Date(caseData.deadline).getTime() - Date.now() < 30 * 60 * 1000
    ? "border-l-yellow-500"
    : "border-l-green-500";

  return (
    <>
      <div
        className={`bg-white rounded-lg shadow-sm border border-l-4 ${borderColor} p-4 space-y-3`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-bold text-lg">{caseData.client}</h3>
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

        {/* Deadline countdown */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Deadline:</span>
          <CountdownTimer deadline={caseData.deadline} />
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
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleFirstContact}
            disabled={loading === "contact" || !!caseData.firstContactAt}
            className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {caseData.firstContactAt ? "✓ Kontakt wysłany" : "📧 Kontakt wstępny"}
          </button>

          <button
            onClick={handleExtend}
            disabled={loading === "extend" || caseData.extended}
            className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {caseData.extended ? "Przedłużono" : "+1h"}
          </button>

          <button
            onClick={() => setShowCloseModal(true)}
            disabled={loading === "close"}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            ✅ Odpowiedź udzielona
          </button>

          <button
            onClick={() => setShowEdit(!showEdit)}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ✏️ Edycja
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

function EditForm({
  caseData,
  onSave,
  onCancel,
}: {
  caseData: CaseData;
  onSave: (data: Partial<CaseData>) => void;
  onCancel: () => void;
}) {
  const [owner, setOwner] = useState(caseData.owner || "");
  const [dept, setDept] = useState(caseData.dept);

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Pracownik odpowiedzialny</label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
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
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ owner, dept })}
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
