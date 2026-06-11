export const DEPT_LABELS: Record<string, string> = {
  KADRY: "Kadry",
  ADMINISTRACJA: "Administracja",
  KONTAKT: "Kontakt",
  HR: "HR",
  KSIEGOWOSC: "Księgowość",
  B2B: "B2B",
  OPLATY: "Opłaty",
  LEGALIZACJA: "Legalizacja",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

export const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Telefon",
  EMAIL: "E-mail",
  SMS: "SMS",
};

export const STATUS_LABELS: Record<string, string> = {
  ZGLOSZONA: "Zgłoszona",
  PRZYJETA: "Przyjęta",
  KONTAKT_WSTEPNY: "Kontakt wstępny wysłany",
  W_TOKU: "W toku",
  PRZEDLUZONO: "Przedłużono",
  ZAMKNIETE: "Zamknięte",
  // Legacy
  NOWE: "Nowe",
  OCZEKUJE_NA_DEADLINE: "Oczekuje na deadline",
};

export const STATUS_COLORS: Record<string, string> = {
  ZGLOSZONA: "bg-purple-100 text-purple-800",
  PRZYJETA: "bg-blue-100 text-blue-800",
  KONTAKT_WSTEPNY: "bg-cyan-100 text-cyan-800",
  W_TOKU: "bg-yellow-100 text-yellow-800",
  PRZEDLUZONO: "bg-orange-100 text-orange-800",
  ZAMKNIETE: "bg-gray-100 text-gray-800",
  NOWE: "bg-blue-100 text-blue-800",
  OCZEKUJE_NA_DEADLINE: "bg-purple-100 text-purple-800",
};

// Departments sorted alphabetically (Polish locale), "Inny" always last
export function getSortedDepartments(): { value: string; label: string }[] {
  const entries = Object.entries(DEPT_LABELS)
    .filter(([key]) => key !== "INNY" && key !== "HR_ENG")
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pl"));
  entries.push({ value: "INNY", label: "Inny" });
  return entries;
}

// Sort any list alphabetically by label (Polish), with optional "always last" item
export function sortAlphabeticallyPL<T extends { name?: string; fullName?: string; label?: string }>(
  items: T[],
  key: keyof T = "name" as keyof T
): T[] {
  return [...items].sort((a, b) => {
    const aVal = String(a[key] || "");
    const bVal = String(b[key] || "");
    return aVal.localeCompare(bVal, "pl");
  });
}
