// src/components/auth/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchJson, UnauthorizedError } from "@/lib/api/fetchJson";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        await fetchJson("/api/me");
        if (!cancelled) {
          setOk(true);
        }
      } catch (error) {
        if (cancelled) return;

        if (error instanceof UnauthorizedError) {
          const next = encodeURIComponent(pathname || "/");
          router.replace(`/login?next=${next}`);
          return;
        }

        setOk(false);
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ok) return null;
  return <>{children}</>;
}
