"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchJson, UnauthorizedError } from "@/lib/api/fetchJson";

type Restrictions = {
  accord_code: string | null;
  restricted_skus: string[];
  total_count: number;
};

type Bootstrap = {
  customer: { firstname: string; lastname: string; email: string };
  restrictions: Restrictions;
};

type Ctx = {
  loading: boolean;
  bootstrap: Bootstrap | null;
  restrictedSkuSet: Set<string>;
  refresh: () => Promise<void>;
};

const BootstrapContext = createContext<Ctx | null>(null);

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error("useBootstrap must be used inside BootstrapProvider");
  return ctx;
}

async function fetchBootstrap(): Promise<Bootstrap> {
  return fetchJson<Bootstrap>("/api/bootstrap");
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const redirectingRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);
    } catch (error) {
      setBootstrap(null);

      if (error instanceof UnauthorizedError) {
        if (redirectingRef.current) return;
        redirectingRef.current = true;
        const next = encodeURIComponent(pathname || "/");
        router.replace(`/login?next=${next}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restrictedSkuSet = useMemo(() => {
    const skus = bootstrap?.restrictions?.restricted_skus ?? [];
    return new Set(skus.map((s) => s.toUpperCase()));
  }, [bootstrap]);

  const value: Ctx = {
    loading,
    bootstrap,
    restrictedSkuSet,
    refresh: load,
  };

  if (loading || !bootstrap) {
    return null;
  }

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}
