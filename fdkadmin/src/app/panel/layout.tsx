"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const navItems = [
    { href: "/panel", label: "Panel" },
    { href: "/panel/nowe", label: "+ Nowe zgłoszenie" },
    { href: "/panel/ustawienia", label: "Ustawienia" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/panel" className="font-bold text-lg text-blue-600">
              FDK Rejestr
            </Link>
            <nav className="hidden sm:flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Wyloguj
          </button>
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex border-t">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-2 text-xs ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700 font-medium border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
