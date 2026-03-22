import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { safeJson, clampPage } from "@/lib/search/utils";
import type { SearchResponse } from "@/types/search";

const PAGE_SIZE = 48;

export function useProductSearch() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse>({ items: [], total_count: 0, mode: "fallback" });
  const [error, setError] = useState<string | null>(null);

  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const query = useMemo(() => q.trim(), [q]);
  const canSearch = useMemo(() => query.length >= 2, [query]);

  const totalPages = useMemo(() => {
    const fromApi = data.page_info?.total_pages;
    if (typeof fromApi === "number" && fromApi > 0) return fromApi;
    const tc = Number(data.total_count ?? 0);
    return Math.max(1, Math.ceil(tc / PAGE_SIZE));
  }, [data.page_info, data.total_count]);

  const runSearch = useCallback(
    async (targetPage: number) => {
      if (!canSearch) return;

      const mySeq = ++reqSeq.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(query)}&page=${targetPage}&pageSize=${PAGE_SIZE}`,
          { cache: "no-store", signal: ac.signal }
        );

        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error ?? "Search failed");
        if (ac.signal.aborted || mySeq !== reqSeq.current) return;

        const next: SearchResponse = {
          mode: json.mode === "strict" ? "strict" : "fallback",
          items: Array.isArray(json.items) ? json.items : [],
          total_count: Number(json.total_count ?? 0),
          page_info: json.page_info,
        };

        setData(next);
        
        // Recalculate pages based on fresh data
        const tp = typeof next.page_info?.total_pages === "number"
            ? next.page_info.total_pages
            : Math.max(1, Math.ceil((next.total_count || 0) / PAGE_SIZE));
            
        setPage(clampPage(targetPage, tp));
      } catch (e: any) {
        if (ac.signal.aborted || mySeq !== reqSeq.current) return;
        setError(e.message || "Search failed");
        setData({ items: [], total_count: 0, mode: "fallback" });
      } finally {
        if (!ac.signal.aborted && mySeq === reqSeq.current) setLoading(false);
      }
    },
    [canSearch, query]
  );

  // Debounce logic
  useEffect(() => {
    const t = setTimeout(() => {
      if (canSearch) void runSearch(1);
      else {
        reqSeq.current++;
        abortRef.current?.abort();
        setData({ items: [], total_count: 0, mode: "fallback" });
        setPage(1);
        setError(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [canSearch, runSearch]);

  // Cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  const goToPage = (n: number) => {
    if (!canSearch) return;
    const next = clampPage(n, totalPages);
    if (next !== page) void runSearch(next);
  };

  return {
    q, setQ,
    page,
    loading,
    data,
    error,
    totalPages,
    canSearch,
    goToPage,
    pageSize: PAGE_SIZE
  };
}