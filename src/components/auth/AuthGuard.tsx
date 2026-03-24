// src/components/auth/AuthGuard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchJson, UnauthorizedError } from "@/lib/api/fetchJson";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = () => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
    };

    const check = async () => {
      try {
        await fetchJson("/api/me");
        if (!cancelled) {
          setAuthorized(true);
        }
      } catch (error) {
        if (cancelled) return;

        if (error instanceof UnauthorizedError) {
          setAuthorized(false);
          redirectToLogin();
          return;
        }

        setAuthorized(false);
        redirectToLogin();
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
