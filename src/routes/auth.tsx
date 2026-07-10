import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Store, ArrowLeft, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  sendOtp,
  verifyOtp,
  staffLogin,
  registerShop,
  normalizePhone,
  isValidSaudiPhone,
  ApiCallError,
} from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول - نَسيج" },
      { name: "description", content: "ابدأ رحلتك مع نَسيج، سوق الأقمشة الفاخرة." },
    ],
  }),
});

type Role = "customer" | "tailor";

function AuthPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top brand strip */}
      <header className="px-5 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary text-accent shadow-md shadow-primary/20">
            <span className="text-lg font-bold">ن</span>
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight">نَسيج</h1>
            <p className="text-[10px] text-muted-foreground">سوق الأقمشة الفاخرة</p>
          </div>
        </Link>
        {role && (
          <button
            onClick={() => setRole(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            تغيير النوع
          </button>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-5 pb-10">
        {!role ? (
          <RolePicker onPick={setRole} />
        ) : (
          <AuthForm role={role} mode={mode} setMode={setMode} />
        )}
      </main>
    </div>
  );
}

function RolePicker({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <div className="pt-6">
      <h2 className="text-3xl font-bold tracking-tight leading-tight">
        أهلاً بك في <span className="text-primary">نَسيج</span>
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        اختر نوع حسابك عشان نجهّز لك التجربة المناسبة
      </p>

      <div className="mt-8 space-y-3">
        <RoleCard
          onClick={() => onPick("customer")}
          icon={<User className="size-5" />}
          title="عميل"
          subtitle="أبي أشوف الأقمشة وأحفظ قياساتي"
          features={["تصفح الأقمشة", "قياسات محفوظة رقمياً", "تواصل مع أفضل الخياطين"]}
        />
        <RoleCard
          onClick={() => onPick("tailor")}
          icon={<Store className="size-5" />}
          title="صاحب خياط"
          subtitle="عندي محل وأبي أدير أقمشتي وعملائي"
          features={["إدارة مخزون الأقمشة", "حفظ قياسات العملاء", "استقبال الطلبات والاستفسارات"]}
          featured
        />
      </div>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        بتسجيلك أنت توافق على <span className="text-foreground font-medium">شروط الاستخدام</span> و{" "}
        <span className="text-foreground font-medium">سياسة الخصوصية</span>
      </p>
    </div>
  );
}

function RoleCard({
  onClick,
  icon,
  title,
  subtitle,
  features,
  featured = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full text-right rounded-3xl p-5 transition hover:-translate-y-0.5 relative overflow-hidden ${
        featured
          ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
          : "bg-card ring-1 ring-border hover:ring-primary/30"
      }`}
    >
      {featured && (
        <>
          <div className="absolute -left-10 -bottom-10 size-40 rounded-full bg-accent/15 blur-3xl" />
          <span className="absolute top-4 left-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary">
            الأكثر طلباً
          </span>
        </>
      )}
      <div className="relative flex items-start gap-4">
        <div
          className={`grid size-12 place-items-center rounded-2xl shrink-0 ${
            featured ? "bg-accent text-primary" : "bg-secondary text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold">{title}</h3>
          <p
            className={`mt-0.5 text-xs ${
              featured ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </p>
          <ul className="mt-3 space-y-1">
            {features.map((f) => (
              <li
                key={f}
                className={`flex items-center gap-1.5 text-[11px] ${
                  featured ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}
              >
                <span className={`size-1 rounded-full ${featured ? "bg-accent" : "bg-primary"}`} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <ArrowLeft
          className={`size-4 shrink-0 mt-2 transition group-hover:-translate-x-1 ${
            featured ? "text-accent" : "text-muted-foreground"
          }`}
        />
      </div>
    </button>
  );
}

// Shared field-shell styling reused across every input so the design stays consistent.
const fieldWrap = "mt-1.5 flex items-center gap-2 rounded-2xl bg-card ring-1 ring-border p-1.5";
const fieldInput = "flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none";
const primaryBtn =
  "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-60";

function AuthForm({
  role,
  mode,
  setMode,
}: {
  role: Role;
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
}) {
  return (
    <div className="pt-6">
      <div className="flex items-center gap-2 mb-6">
        <div
          className={`grid size-10 place-items-center rounded-2xl ${
            role === "tailor" ? "bg-primary text-accent" : "bg-secondary text-primary"
          }`}
        >
          {role === "tailor" ? <Store className="size-5" /> : <User className="size-5" />}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">نوع الحساب</p>
          <h2 className="text-sm font-bold">{role === "tailor" ? "صاحب خياط" : "عميل"}</h2>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {role === "customer"
          ? mode === "login"
            ? "ادخل رقم جوالك لإرسال رمز التحقق"
            : "نبدأ برقم جوالك، وباقي التفاصيل تعبيها بعدين"
          : mode === "login"
            ? "ادخل بريدك وكلمة المرور"
            : "سجّل محلك وابدأ فوراً، بدون موافقات"}
      </p>

      {/* Toggle */}
      <div className="mt-5 flex rounded-2xl bg-secondary p-1">
        <button
          onClick={() => setMode("login")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          دخول
        </button>
        <button
          onClick={() => setMode("register")}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          حساب جديد
        </button>
      </div>

      {role === "customer" ? <CustomerAuth mode={mode} /> : <TailorAuth mode={mode} />}
    </div>
  );
}

function CustomerAuth({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const normalized = normalizePhone(phone);
    if (!isValidSaudiPhone(normalized)) {
      toast.error("رقم الجوال غير صحيح");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(normalized);
      setStep("code");
      // Dev-mode delivery: surface the code so it can be entered without SMS.
      toast.success(`رمز التحقق (وضع التطوير): ${res.dev_code}`, { duration: 10000 });
    } catch (e) {
      toast.error(e instanceof ApiCallError ? e.message : "تعذر إرسال الرمز");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.trim().length < 4) {
      toast.error("ادخل رمز التحقق");
      return;
    }
    if (mode === "register" && fullName.trim() === "") {
      toast.error("ادخل اسمك");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(
        normalizePhone(phone),
        code.trim(),
        mode === "register" ? fullName.trim() : undefined,
      );
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof ApiCallError ? e.message : "تعذر التحقق");
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <div>
        {mode === "register" && (
          <div className="mt-5">
            <label className="text-[11px] font-medium text-muted-foreground">الاسم الكامل</label>
            <div className={fieldWrap}>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الكامل"
                className={fieldInput}
              />
            </div>
          </div>
        )}
        <div className="mt-5">
          <label className="text-[11px] font-medium text-muted-foreground">رمز التحقق</label>
          <div className={fieldWrap}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="______"
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              className={`${fieldInput} text-center tracking-[0.5em]`}
            />
          </div>
          <button
            onClick={() => setStep("phone")}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            تعديل رقم الجوال
          </button>
        </div>
        <button onClick={handleVerify} disabled={loading} className={primaryBtn}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          تأكيد الدخول
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mt-5">
        <label className="text-[11px] font-medium text-muted-foreground">رقم الجوال</label>
        <div className={fieldWrap}>
          <div className="flex items-center gap-1.5 px-3 py-2 border-l border-border">
            <span className="text-sm font-medium">🇸🇦</span>
            <span className="text-xs text-muted-foreground">+966</span>
          </div>
          <Phone className="size-4 text-muted-foreground" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5X XXX XXXX"
            inputMode="numeric"
            dir="ltr"
            className="flex-1 bg-transparent px-2 py-2 text-sm text-right focus:outline-none"
          />
        </div>
      </div>
      <button onClick={handleSend} disabled={loading} className={primaryBtn}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {mode === "login" ? "أرسل رمز التحقق" : "إنشاء الحساب"}
      </button>
    </div>
  );
}

function TailorAuth({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      toast.error("ادخل بريداً صحيحاً وكلمة مرور (٦ أحرف على الأقل)");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await staffLogin(email.trim(), password);
      } else {
        if (!shopName.trim() || !ownerName.trim()) {
          toast.error("ادخل اسم المحل واسم المالك");
          setLoading(false);
          return;
        }
        await registerShop({
          shopName: shopName.trim(),
          location: location.trim(),
          contactPhone: contactPhone.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          password,
        });
      }
      navigate({ to: "/shop" });
    } catch (e) {
      toast.error(e instanceof ApiCallError ? e.message : "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {mode === "register" && (
        <>
          <TextField
            label="اسم المحل"
            value={shopName}
            onChange={setShopName}
            placeholder="خياط الفخامة"
          />
          <TextField
            label="اسم المالك"
            value={ownerName}
            onChange={setOwnerName}
            placeholder="الاسم الكامل"
          />
          <TextField
            label="المدينة / الموقع"
            value={location}
            onChange={setLocation}
            placeholder="الرياض، حي التخصصي"
          />
          <TextField
            label="رقم تواصل المحل"
            value={contactPhone}
            onChange={setContactPhone}
            placeholder="05XXXXXXXX"
            dir="ltr"
          />
        </>
      )}
      <TextField
        label="البريد الإلكتروني"
        value={email}
        onChange={setEmail}
        placeholder="shop@example.com"
        dir="ltr"
        type="email"
      />
      <TextField
        label="كلمة المرور"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        dir="ltr"
        type="password"
      />
      <button onClick={handleSubmit} disabled={loading} className={primaryBtn}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {mode === "login" ? "تسجيل الدخول" : "إنشاء المحل"}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  dir,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  type?: string;
}) {
  return (
    <div className="mt-4">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <div className={fieldWrap}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          type={type}
          className={fieldInput}
        />
      </div>
    </div>
  );
}
