"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  const res = await fetch("/api/bootstrap", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json && typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Bootstrap failed (${res.status})`;
    throw new Error(msg);
  }

  return json as Bootstrap;
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);
    } catch {
      setBootstrap(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}
