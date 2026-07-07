import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Search, Heart, Ruler, User } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/search", label: "البحث", icon: Search },
  { to: "/saved", label: "المحفوظات", icon: Heart },
  { to: "/measurements", label: "القياسات", icon: Ruler },
  { to: "/profile", label: "الملف", icon: User },
] as const;

export function AppShell({
  children,
  title,
  showTopBar = true,
}: {
  children: ReactNode;
  title?: string;
  showTopBar?: boolean;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showTopBar && (
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="grid size-10 place-items-center rounded-2xl bg-primary text-accent shadow-md shadow-primary/20">
                <span className="text-lg font-bold">ن</span>
              </div>
              <div className="leading-tight">
                <h1 className="text-base font-bold tracking-tight">{title ?? "نَسيج"}</h1>
                <p className="text-[10px] text-muted-foreground">سوق الأقمشة الفاخرة</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <button
                className="relative grid size-10 place-items-center rounded-2xl border border-border bg-card transition hover:bg-muted"
                aria-label="الإشعارات"
              >
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-1.5 rounded-full bg-accent" />
              </button>
              <Link
                to="/profile"
                className="size-10 rounded-2xl bg-gradient-to-br from-accent to-accent/60 grid place-items-center text-xs font-bold text-primary"
                aria-label="حسابي"
              >
                س
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-2xl px-5 pt-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-2.5 safe-area">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 py-1.5 px-2 group">
                <div
                  className={`grid size-10 place-items-center rounded-2xl transition ${
                    active
                      ? "bg-primary text-accent shadow-md shadow-primary/25"
                      : "text-muted-foreground group-hover:bg-muted"
                  }`}
                >
                  <Icon className="size-[18px]" />
                </div>
                <span
                  className={`text-[10px] font-medium transition ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
