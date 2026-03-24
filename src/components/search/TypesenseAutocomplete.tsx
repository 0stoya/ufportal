"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  InstantSearch,
  Configure,
  useHits,
  useSearchBox,
} from "react-instantsearch-hooks-web";
import { searchClient } from "@/lib/typesense/instantsearchClient";
import { TYPESENSE_COLLECTION } from "@/lib/typesense/config";
import { Search, Loader2 } from "lucide-react";

function Suggestions({ onPick }: { onPick?: () => void }) {
  const { hits } = useHits<any>(); // Keep 'any' for flexibility with raw Typesense hits
  const hasHits = hits.length > 0;

  if (!hasHits) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No results
      </div>
    );
  }

  return (
    <ul className="py-2">
      {hits.map((h: any) => {
        // RESTORED: Your original logic for ID/SKU fallback
        const sku = h.sku || h.id; 
        const name = h.name || "";
        const brand = h.brand || "";

        return (
          <li key={h.objectID ?? sku}>
            <Link
              href={`/product/${encodeURIComponent(sku)}`}
              className="block px-3 py-2 hover:bg-muted rounded-md"
              onClick={onPick} // RESTORED: Closes dropdown on click
            >
              <div className="text-sm font-medium leading-tight">{name}</div>
              <div className="text-xs text-muted-foreground">
                {/* RESTORED: Your original brand • sku format */}
                {brand ? `${brand} • ` : ""}{sku}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SearchInput({ placeholder = "Search products…" }: { placeholder?: string }) {
  const { query, refine, isSearchStalled } = useSearchBox();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmed = (query || "").trim();
  const showDropdown = open && trimmed.length >= 2;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            refine(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-base sm:text-sm"
          autoComplete="off"
        />
        {isSearchStalled ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-background shadow-lg">
          <Suggestions onPick={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

export default function TypesenseAutocomplete() {
  if (!searchClient) {
    return <SearchInput />;
  }

  return (
    <InstantSearch searchClient={searchClient} indexName={TYPESENSE_COLLECTION}>
      {/* Kept 'as any' to be safe since it worked for you before */}
      <Configure {...({ hitsPerPage: 8 } as any)} />
      <SearchInput />
    </InstantSearch>
  );
}
