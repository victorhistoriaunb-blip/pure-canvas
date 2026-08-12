import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FinanceProvider } from "@/lib/finance-store";
import { AuthProvider } from "@/lib/auth-context";

export const Route = createFileRoute("/_gated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: GatedLayout,
});

function GatedLayout() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <Outlet />
      </FinanceProvider>
    </AuthProvider>
  );
}
