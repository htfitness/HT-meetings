import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../auth";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard" },
  { path: "/current", label: "Current Meeting" },
  { path: "/next-agenda", label: "Next Meeting Agenda" },
  { path: "/history", label: "Meeting History" },
  { path: "/topics", label: "Next Meeting Topics" },
  { path: "/action-items", label: "My Action Items" },
  { path: "/search", label: "Search" },
];

export const GROUP_STORAGE_KEY = "ht_active_group";

export function useActiveGroup() {
  const { groups } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(() => {
    const saved = localStorage.getItem(GROUP_STORAGE_KEY);
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    if (groups.length === 0) return;
    if (!activeId || !groups.some((g) => g.id === activeId)) {
      const first = groups[0].id;
      setActiveId(first);
      localStorage.setItem(GROUP_STORAGE_KEY, String(first));
    }
  }, [groups, activeId]);

  const setGroup = (id: number) => {
    setActiveId(id);
    localStorage.setItem(GROUP_STORAGE_KEY, String(id));
  };

  const activeGroup = groups.find((g) => g.id === activeId) ?? null;
  return { activeGroup, setGroup, groups };
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { activeGroup, setGroup, groups } = useActiveGroup();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const pageName =
    NAV_ITEMS.find((item) =>
      item.path === "/" ? location === "/" : location.startsWith(item.path),
    )?.label ??
    (location.startsWith("/meetings/")
      ? "Meeting"
      : location.startsWith("/template")
        ? "Agenda Template"
        : location.startsWith("/admin")
          ? "Admin"
          : "HT Fitness Meetings");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-ht-black text-white shadow-md no-print">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img
            src="/logo.jpg"
            alt="HT Fitness"
            className="h-11 w-11 rounded-full border-2 border-ht-teal object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {pageName}
            </h1>
            <p className="truncate text-xs text-white/60">{today}</p>
          </div>

          {groups.length > 1 && (
            <select
              value={activeGroup?.id ?? ""}
              onChange={(e) => setGroup(Number(e.target.value))}
              className="hidden rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white sm:block"
              aria-label="Switch meeting group"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="text-ht-black">
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md hover:bg-white/10"
            aria-label="Menu"
          >
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
          </button>
        </div>

        {groups.length > 1 && (
          <div className="border-t border-white/10 px-4 py-2 sm:hidden">
            <select
              value={activeGroup?.id ?? ""}
              onChange={(e) => setGroup(Number(e.target.value))}
              className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white"
              aria-label="Switch meeting group"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="text-ht-black">
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 no-print"
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className="absolute right-0 top-0 flex h-full w-72 flex-col bg-ht-black text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <img
                src="/logo.jpg"
                alt="HT Fitness"
                className="h-10 w-10 rounded-full border-2 border-ht-teal object-cover"
              />
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs text-white/60">{user?.email}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium transition-colors ${
                    location === item.path
                      ? "bg-ht-teal text-white"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {(activeGroup?.memberRole === "group_admin" ||
                user?.role === "admin") && (
                <Link
                  href="/template"
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium transition-colors ${
                    location === "/template"
                      ? "bg-ht-teal text-white"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  Agenda Template
                </Link>
              )}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium transition-colors ${
                    location === "/admin"
                      ? "bg-ht-teal text-white"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="border-t border-white/10 px-4 py-3 text-left text-sm font-medium text-ht-orange hover:bg-white/10"
            >
              Sign out
            </button>
          </nav>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-black/10 py-4 text-center text-xs text-ht-gray no-print">
        HT Fitness Meetings — stay on track, stay focused on the 20.
      </footer>
    </div>
  );
}
