// src/components/auth/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = async () => {
    const res = await fetch("/api/me", { cache: "no-store" }).catch(() => null);

    // Treat transient/network failures as non-auth errors so users are not
    // kicked to login when reopening the PWA without connectivity yet.
    if (!res) {
      setChecking(false);
      setOk(true);
      return;
    }

    if (res.status === 401 || res.status === 403) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!res.ok) {
      setChecking(false);
      setOk(true);
      return;
    }

    setChecking(false);
    setOk(true);
  };

  useEffect(() => {
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking && !ok) return null;
  return <>{children}</>;
}
