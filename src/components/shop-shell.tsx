import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, LayoutDashboard, Package, Users, Inbox, Settings, UserCog } from "lucide-react";
import type { ReactNode } from "react";

const items = [
  { to: "/shop", label: "لوحة التحكم", icon: LayoutDashboard, exact: true, badge: undefined },
  { to: "/shop/inventory", label: "الأقمشة", icon: Package, exact: false, badge: undefined },
  { to: "/shop/customers", label: "العملاء", icon: Users, exact: false, badge: undefined },
  { to: "/shop/inbox", label: "الرسائل", icon: Inbox, exact: false, badge: undefined },
  { to: "/shop/staff", label: "الموظفون", icon: UserCog, exact: false, badge: undefined },
] as const;

export function ShopShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-accent">
              <span className="text-lg font-bold">خ</span>
            </div>
            <div>
              <h1 className="text-base font-bold">{title ?? "خياط الفخامة"}</h1>
              <p className="text-[10px] text-muted-foreground">لوحة إدارة المحل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative grid size-10 place-items-center rounded-2xl border border-border bg-card">
              <Bell className="size-4" />
              <span className="absolute top-2 left-2 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-primary">
                3
              </span>
            </button>
            <Link
              to="/"
              className="hidden md:inline-flex rounded-2xl border border-border bg-card px-3 py-2 text-[11px] font-medium"
            >
              وضع العميل
            </Link>
            <button className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <Settings className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-5 py-6">
        {/* Sidebar for desktop */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col gap-1">
          {items.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-accent text-primary" : "bg-accent/20 text-accent-foreground"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            to="/"
            className="mt-4 md:hidden flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5 text-sm font-medium"
          >
            وضع العميل
          </Link>
        </aside>

        <main className="flex-1 min-w-0 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-2.5">
          {items.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 py-1 px-2">
                <div
                  className={`relative grid size-10 place-items-center rounded-2xl transition ${
                    active
                      ? "bg-primary text-accent shadow-md shadow-primary/25"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-[18px]" />
                  {badge && (
                    <span className="absolute -top-1 -left-1 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-primary">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
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
