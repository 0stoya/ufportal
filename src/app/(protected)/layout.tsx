import AppShell from "@/components/layout/AppShell";
import { BootstrapProvider } from "@/components/bootstrap/BootstrapProvider";
import { PortalStateProvider } from "@/components/layout/PortalStateProvider";
import AuthGuard from "@/components/auth/AuthGuard";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
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
