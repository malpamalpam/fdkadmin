"use client";

import { useState } from "react";

interface CloseModalProps {
  onClose: () => void;
  onSubmit: (note: string) => void;
  loading: boolean;
}

export function CloseModal({ onClose, onSubmit, loading }: CloseModalProps) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold">Zamknij sprawę</h3>
        <p className="text-sm text-gray-600">
          Opisz jak została rozwiązana sprawa (wymagane):
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Jak rozwiązano sprawę..."
          rows={4}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Anuluj
          </button>
          <button
            onClick={() => onSubmit(note)}
            disabled={!note.trim() || loading}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Zamykanie..." : "Zamknij sprawę"}
          </button>
        </div>
      </div>
    </div>
  );
}
