"use client";

interface Case { id: string; status: string; deadline: string | null; closedAt: string | null; createdAt: string; }

export function StatsBar({ openCases, closedCases }: { openCases: Case[]; closedCases: Case[] }) {
  const now = new Date();
  const overdue = openCases.filter((c) => c.deadline && new Date(c.deadline) < now).length;
  const zgloszone = openCases.filter((c) => c.status === "ZGLOSZONA" || c.status === "OCZEKUJE_NA_DEADLINE").length;
  const przyjete = openCases.filter((c) => c.status === "PRZYJETA" || c.status === "NOWE").length;

  const stats = [
    { label: "Otwarte", value: openCases.length, color: "bg-blue-500" },
    { label: "Po terminie", value: overdue, color: overdue > 0 ? "bg-red-500" : "bg-gray-400" },
    { label: "Zgłoszone", value: zgloszone, color: zgloszone > 0 ? "bg-purple-500" : "bg-gray-400" },
    { label: "Przyjęte", value: przyjete, color: przyjete > 0 ? "bg-blue-400" : "bg-gray-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-500">{stat.label}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-3 h-3 rounded-full ${stat.color}`} />
            <span className="text-2xl font-bold">{stat.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
