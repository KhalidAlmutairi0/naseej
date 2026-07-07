import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";

// Route guard. project-structure.md: a staff session cannot open /me/* customer routes,
// a customer session cannot open /shop/*. Unauthenticated users go to /auth.
export function RequireRole({
  role,
  children,
}: {
  role: "customer" | "staff";
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated, role: current } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/auth" });
    } else if (current && current !== role) {
      navigate({ to: current === "staff" ? "/shop" : "/" });
    }
  }, [isLoading, isAuthenticated, current, role, navigate]);

  if (isLoading || !isAuthenticated || current !== role) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
