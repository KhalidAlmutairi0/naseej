import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireRole } from "@/components/require-role";

export const Route = createFileRoute("/shop")({
  component: ShopLayout,
  head: () => ({
    meta: [
      { title: "لوحة الخياط — نَسيج" },
      { name: "description", content: "أدر أقمشتك، قياسات عملائك، ورسائلك من مكان واحد." },
    ],
  }),
});

function ShopLayout() {
  return (
    <RequireRole role="staff">
      <Outlet />
    </RequireRole>
  );
}
