import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { useContactShop } from "@/hooks/useContactRequests";
import type { UUID } from "@/lib/types";

// F9: the only purchase-adjacent action. Logs a contact_request, deduped 24h (app-layer).
export function ContactShopButton({
  fabricId,
  shopId,
  className,
}: {
  fabricId: UUID;
  shopId: UUID;
  className?: string;
}) {
  const { role, isAuthenticated } = useSession();
  const contact = useContactShop();
  const navigate = useNavigate();

  function handleClick() {
    if (!isAuthenticated) {
      toast.info("سجّل دخولك للتواصل مع الخياط");
      navigate({ to: "/auth" });
      return;
    }
    if (role !== "customer") {
      toast.info("التواصل متاح لحسابات العملاء فقط");
      return;
    }
    contact.mutate(
      { fabricId, shopId },
      {
        onSuccess: (res) =>
          toast.success(
            res.deduped
              ? "تواصلت مع هذا الخياط مؤخراً — طلبك مسجّل"
              : "تم إرسال طلب التواصل للخياط",
          ),
        onError: () => toast.error("تعذّر إرسال الطلب. حاول مرة أخرى."),
      },
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={contact.isPending}
      className={
        className ??
        "flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-60"
      }
    >
      {contact.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageCircle className="size-4" />
      )}
      تواصل مع الخياط
    </button>
  );
}
