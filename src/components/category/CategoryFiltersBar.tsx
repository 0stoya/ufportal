"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function clampPageSize(ps: string | null) {
  const n = Number(ps);
  if (n === 48 || n === 96) return n;
  return 24;
}

export default function CategoryFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initial = useMemo(() => {
    return {
      q: sp.get("q") ?? "",
      inStock: sp.get("in_stock") === "1",
      sort: sp.get("sort") ?? "relevance",
      ps: clampPageSize(sp.get("ps")),
    };
  }, [sp]);

  const [q, setQ] = useState(initial.q);
  const [inStock, setInStock] = useState(initial.inStock);
  const [sort, setSort] = useState(initial.sort);
  const [ps, setPs] = useState<number>(initial.ps);

  function push(next?: Partial<{ q: string; inStock: boolean; sort: string; ps: number }>) {
    const params = new URLSearchParams(sp.toString());

    // Reset page whenever filters change
    params.delete("page");

    const nq = (next?.q ?? q).trim();
    if (nq) params.set("q", nq);
    else params.delete("q");

    const stock = next?.inStock ?? inStock;
    if (stock) params.set("in_stock", "1");
    else params.delete("in_stock");

    const nsort = next?.sort ?? sort;
    if (nsort && nsort !== "relevance") params.set("sort", nsort);
    else params.delete("sort");

    const nps = next?.ps ?? ps;
    if (nps && nps !== 24) params.set("ps", String(nps));
    else params.delete("ps");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clear() {
    router.push(pathname);
  }

  return (
    <div className="rounded-2xl border bg-card p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-muted-foreground">
            Search in category
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ q });
            }}
            placeholder="e.g. ham, milk, bitter…"
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => {
              setInStock(e.target.checked);
              push({ inStock: e.target.checked });
            }}
            className="h-4 w-4"
          />
          In stock only
        </label>

        <div className="w-full md:w-56">
          <label className="block text-xs font-semibold text-muted-foreground">Sort</label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              push({ sort: e.target.value });
            }}
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
        </div>

        <div className="w-full md:w-40">
          <label className="block text-xs font-semibold text-muted-foreground">Per page</label>
          <select
            value={ps}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPs(n);
              push({ ps: n });
            }}
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
          >
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => push({ q })}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
