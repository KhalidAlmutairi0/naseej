import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Ruler,
  Heart,
  Bell,
  HelpCircle,
  Shield,
  Globe,
  Moon,
  LogOut,
  Store,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useCustomerProfile } from "@/hooks/useCustomers";
import { useCustomerHistory } from "@/hooks/useMeasurements";
import { useFabricMemory } from "@/hooks/useFabrics";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireRole role="customer">
      <ProfilePage />
    </RequireRole>
  ),
  head: () => ({
    meta: [{ title: "الملف الشخصي — نَسيج" }, { name: "description", content: "حسابك وإعداداتك." }],
  }),
});

function initials(name?: string) {
  return (name ?? "؟")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

function ProfilePage() {
  const navigate = useNavigate();
  const { data: profile } = useCustomerProfile();
  const { data: measurements = [] } = useCustomerHistory();
  const { data: memory = [] } = useFabricMemory();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell title="حسابي">
      <div className="card-elevated p-5 bg-gradient-to-br from-secondary to-background">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-3xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center text-primary-foreground text-xl font-bold ring-4 ring-background">
            {initials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">{profile?.full_name ?? "—"}</h2>
            <p className="text-xs text-muted-foreground" dir="ltr">
              {profile?.phone ?? ""}
            </p>
            {profile?.created_at && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                عضو منذ {new Date(profile.created_at).getFullYear()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Stat label="القياسات" value={measurements.length} />
          <Stat label="ذاكرة الأقمشة" value={memory.length} />
        </div>
      </div>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-bold">اختصارات</h3>
        <div className="space-y-2">
          <Row to="/measurements" icon={<Ruler className="size-4" />} label="قياساتي" />
          <Row to="/saved" icon={<Heart className="size-4" />} label="ذاكرة الأقمشة" />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-bold">الإعدادات</h3>
        <div className="card-elevated overflow-hidden">
          <Setting icon={<Bell className="size-4" />} label="الإشعارات" trailing="مفعّل" />
          <Setting icon={<Globe className="size-4" />} label="اللغة" trailing="العربية" />
          <Setting icon={<Moon className="size-4" />} label="المظهر" trailing="فاتح" />
          <Setting icon={<Shield className="size-4" />} label="الخصوصية والأمان" />
          <Setting icon={<HelpCircle className="size-4" />} label="مركز المساعدة" />
        </div>
      </section>

      <section className="mt-6">
        <Link
          to="/shop"
          className="flex items-center gap-3 card-elevated p-4 bg-primary text-primary-foreground"
        >
          <div className="grid size-10 place-items-center rounded-2xl bg-accent text-primary">
            <Store className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold">وضع الخياط</h4>
            <p className="text-[11px] text-primary-foreground/70">انتقل للوحة تحكم المحل</p>
          </div>
          <ChevronLeft className="size-4" />
        </Link>
      </section>

      <button
        onClick={handleSignOut}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-medium text-destructive"
      >
        <LogOut className="size-4" />
        تسجيل الخروج
      </button>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-2.5 ring-1 ring-border">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 card-elevated p-3.5 hover:bg-secondary/50 transition"
    >
      <div className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronLeft className="size-4 text-muted-foreground" />
    </Link>
  );
}

function Setting({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: string;
}) {
  return (
    <button className="w-full flex items-center gap-3 border-b border-border/50 px-4 py-3.5 last:border-0 hover:bg-secondary/50">
      <div className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <span className="flex-1 text-right text-sm font-medium">{label}</span>
      {trailing && <span className="text-xs text-muted-foreground">{trailing}</span>}
      <ChevronLeft className="size-4 text-muted-foreground" />
    </button>
  );
}
