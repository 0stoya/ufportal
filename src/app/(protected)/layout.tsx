import AppShell from "@/components/layout/AppShell";
import { BootstrapProvider } from "@/components/bootstrap/BootstrapProvider";
import { PortalStateProvider } from "@/components/layout/PortalStateProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import { getCustomerToken } from "@/lib/auth/cookies";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = await getCustomerToken();
  if (!token) {
    redirect("/login");
  }

  return (
    <AuthGuard>
      <BootstrapProvider>
        <PortalStateProvider>
          <AppShell>{children}</AppShell>
        </PortalStateProvider>
      </BootstrapProvider>
    </AuthGuard>
  );
}
