import { createFileRoute } from "@tanstack/react-router";
import { UserCog, Trash2, Crown, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { ShopShell } from "@/components/shop-shell";
import { useSession } from "@/hooks/useSession";
import { useStaffList, useRemoveStaff } from "@/hooks/useStaff";

export const Route = createFileRoute("/shop/staff")({
  component: StaffManagement,
  head: () => ({
    meta: [
      { title: "الموظفون — لوحة الخياط" },
      { name: "description", content: "أدر موظفي محلك." },
    ],
  }),
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

function StaffManagement() {
  const { shopId, userId, staffRole } = useSession();
  const { data: staff = [], isLoading } = useStaffList(shopId);
  const remove = useRemoveStaff(shopId);
  const isOwner = staffRole === "owner";

  return (
    <ShopShell title="الموظفون">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">فريق المحل</h1>
        <p className="mt-1 text-xs text-muted-foreground">{staff.length} عضو</p>
      </div>

      {/* Add-staff limitation notice (F11 gap — see docs) */}
      {isOwner && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl bg-secondary/60 p-4 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p>
            إضافة موظف جديد تتطلب إنشاء حساب دخول له من جهة الخادم — هذه الخطوة غير متاحة في الإصدار
            الحالي (تحتاج تحديثاً في العقود قبل تفعيلها). يمكنك عرض وإزالة الموظفين الحاليين.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="card-elevated p-4 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                {initials(s.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold truncate">{s.full_name}</h4>
                  {s.role === "owner" && (
                    <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      <Crown className="size-3" />
                      مالك
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {s.role === "owner" ? "مالك المحل" : "موظف"}
                </p>
              </div>
              {isOwner && s.id !== userId && s.role !== "owner" && (
                <button
                  onClick={() =>
                    remove.mutate(s.id, { onSuccess: () => toast.success("تمت إزالة الموظف") })
                  }
                  aria-label="إزالة"
                  className="grid size-9 place-items-center rounded-xl text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isOwner && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCog className="size-4" />
          إدارة الموظفين متاحة لمالك المحل فقط.
        </p>
      )}
    </ShopShell>
  );
}
