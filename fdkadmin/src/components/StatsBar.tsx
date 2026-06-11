"use client";

interface Case {
  id: string;
  status: string;
  deadline: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface StatsBarProps {
  openCases: Case[];
  closedCases: Case[];
}

export function StatsBar({ openCases, closedCases }: StatsBarProps) {
  const now = new Date();
  const overdue = openCases.filter(
    (c) => c.deadline && new Date(c.deadline) < now
  ).length;
  const pendingDeadline = openCases.filter(
    (c) => c.status === "OCZEKUJE_NA_DEADLINE"
  ).length;
  const today = openCases.filter(
    (c) => new Date(c.createdAt).toDateString() === now.toDateString()
  ).length;

  const stats = [
    { label: "Otwarte", value: openCases.length, color: "bg-blue-500" },
    { label: "Po terminie", value: overdue, color: overdue > 0 ? "bg-red-500" : "bg-gray-400" },
    { label: "Bez deadline'u", value: pendingDeadline, color: pendingDeadline > 0 ? "bg-purple-500" : "bg-gray-400" },
    { label: "Zamknięte (30 dni)", value: closedCases.length, color: "bg-gray-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-lg shadow-sm border p-4"
        >
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
