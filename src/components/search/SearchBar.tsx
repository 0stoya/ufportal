"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Configure,
  InstantSearch,
  useHits,
  useSearchBox,
  UseHitsProps,
  UseConfigureProps
} from "react-instantsearch-hooks-web";
import { Loader2, Search, Package, ArrowRight, X } from "lucide-react";
import { searchClient } from "@/lib/typesense/instantsearchClient";
// ✅ CRITICAL FIX 1: Import collection AND config from the correct file
import { TYPESENSE_COLLECTION, SEARCH_CONFIG } from "@/lib/typesense/config"; 

// --------------------
// Types
// --------------------

type Props = {
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
};

type HitDoc = {
  objectID?: string;
  id?: string;
  sku?: string;
  name?: string;
  small_image?: string | { url?: string | null } | null;
  "small_image.url"?: string | null;
  image?: string | null;
  image_url?: string | null;
  brand?: string | null;
  document?: {
    small_image?: string | { url?: string | null } | null;
    "small_image.url"?: string | null;
    image?: string | null;
    image_url?: string | null;
  };
};

type SearchApiResponse = {
  items?: Array<{
    sku?: string;
    small_image?: string | null;
  }>;
};

// --------------------
// Constants
// --------------------

const MIN_QUERY_LEN = 2;
const MAX_SUGGESTIONS = 6; 

// --------------------
// Helpers
// --------------------

function normStr(v: unknown): string {
  return String(v ?? "").trim();
}

function getSku(hit: Partial<HitDoc>): string {
  return normStr(hit.sku ?? hit.id ?? "");
}

function getHref(hit: Partial<HitDoc>): string | null {
  const sku = getSku(hit);
  if (!sku) return null;
  return `/product/${encodeURIComponent(sku)}`;
}

function buildImageMap(items: SearchApiResponse["items"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items || []) {
    const sku = normStr(item?.sku).toUpperCase();
    const image = normStr(item?.small_image);
    if (!sku || !image) continue;
    out[sku] = image;
  }
  return out;
}

function extractImageUrl(hit: Partial<HitDoc>): string {
  const smallImage = hit.small_image;
  if (typeof smallImage === "string" && smallImage.trim()) return smallImage.trim();
  if (smallImage && typeof smallImage === "object" && typeof smallImage.url === "string" && smallImage.url.trim()) {
    return smallImage.url.trim();
  }

  const nestedSmallImage = hit.document?.small_image;
  if (typeof nestedSmallImage === "string" && nestedSmallImage.trim()) return nestedSmallImage.trim();
  if (
    nestedSmallImage &&
    typeof nestedSmallImage === "object" &&
    typeof nestedSmallImage.url === "string" &&
    nestedSmallImage.url.trim()
  ) {
    return nestedSmallImage.url.trim();
  }

  return normStr(
    hit["small_image.url"] ??
      hit.document?.["small_image.url"] ??
      hit.image ??
      hit.document?.image ??
      hit.image_url ??
      hit.document?.image_url
  );
}

// --------------------
// UI Sub-Components
// --------------------

function SuggestionRow({ hit, active, onPick }: { hit: HitDoc; active: boolean; onPick: () => void; }) {
  const name = hit.name || "Unknown Product";
  const sku = getSku(hit);
  const brand = hit.brand ? normStr(hit.brand) : null;
  const img = extractImageUrl(hit);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={`
        w-full text-left px-4 py-3 flex items-center gap-4 transition-colors duration-150
        ${active ? "bg-slate-100" : "hover:bg-slate-50"}
      `}
    >
      <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-contain p-1" />
        ) : (
          <Package className="h-5 w-5 text-slate-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate leading-tight">{name}</div>
        <div className="text-xs text-slate-500 mt-1 truncate flex items-center gap-1.5">
          {brand && <span className="font-medium text-slate-700">{brand}</span>}
          {brand && <span className="text-slate-300">•</span>}
          <span className="font-mono bg-slate-100 px-1 rounded text-[10px] border border-slate-200">{sku}</span>
        </div>
      </div>
      {active && <ArrowRight className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

function Suggestions({ query, activeIndex, onPickHref, onPickAll }: any) {
  const { hits } = useHits<HitDoc>();
  const [hydratedImageBySku, setHydratedImageBySku] = useState<Record<string, string>>({});
  // We use hitsPerPage in Configure, but slice here just to be safe visually
  const items = useMemo(() => hits.slice(0, MAX_SUGGESTIONS), [hits]);
  const upperQuery = query.trim().toUpperCase();

  useEffect(() => {
    const abort = new AbortController();
    const skusNeedingImages = items
      .filter((hit) => !extractImageUrl(hit))
      .map((hit) => getSku(hit))
      .filter(Boolean);

    if (!upperQuery || skusNeedingImages.length === 0) {
      setHydratedImageBySku({});
      return () => abort.abort();
    }

    const run = async () => {
      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(query)}&page=1&pageSize=${MAX_SUGGESTIONS}`,
          { signal: abort.signal, cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as SearchApiResponse;
        if (abort.signal.aborted) return;
        setHydratedImageBySku(buildImageMap(data.items));
      } catch {
        if (!abort.signal.aborted) setHydratedImageBySku({});
      }
    };

    run();
    return () => abort.abort();
  }, [items, query, upperQuery]);

  // If InstantSearch is active but returns 0 hits
  if (items.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-slate-500 italic">
        No products found for &ldquo;{query}&rdquo;
      </div>
    );
  }

  return (
    <>
      <ul className="py-2">
        {items.map((hit, idx) => {
          const href = getHref(hit);
          if (!href) return null;
          const key = hit.objectID || hit.sku || idx;
          const sku = getSku(hit).toUpperCase();
          const fallbackImage = hydratedImageBySku[sku];
          const normalizedHit: HitDoc = fallbackImage && !extractImageUrl(hit)
            ? { ...hit, small_image: fallbackImage }
            : hit;
          return (
            <li key={key}>
              <SuggestionRow
                hit={normalizedHit}
                active={idx === activeIndex}
                onPick={() => onPickHref(href)}
              />
            </li>
          );
        })}
      </ul>
      <div className="border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={onPickAll}
          className="w-full text-left px-4 py-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-between group"
        >
          <span>View all results for &ldquo;{query}&rdquo;</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const router = useRouter();
  const { query, refine, isSearchStalled } = useSearchBox();
  const { hits } = useHits<HitDoc>(); 

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();
  const showDropdown = open && trimmed.length >= MIN_QUERY_LEN;

  useEffect(() => {
    if (value !== query) refine(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSubmit = useCallback((sku?: string) => {
    setOpen(false);
    setActiveIndex(-1);
    if (sku) {
      router.push(`/product/${encodeURIComponent(sku)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }, [router, trimmed]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
        if (e.key === "Enter") {
             e.preventDefault();
             handleSubmit();
        }
        return;
    }
    const maxIndex = Math.min(hits.length, MAX_SUGGESTIONS) - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => (prev < maxIndex ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(prev => (prev > -1 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && hits[activeIndex]) {
            const selectedSku = getSku(hits[activeIndex]);
            if (selectedSku) handleSubmit(selectedSku);
        } else {
            handleSubmit();
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    onChange("");
    refine("");
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto z-50">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearchStalled ? (
             <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
             <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, SKU, or brand..."
         // Change text-sm to text-base sm:text-sm
className="block w-full rounded-xl border-slate-200 bg-white pl-10 pr-10 py-3 text-base sm:text-sm text-slate-900..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {value && (
            <button 
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
                <X className="h-4 w-4" />
            </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
          <Suggestions 
            query={value}
            activeIndex={activeIndex}
            onPickHref={(href: string) => {
                setOpen(false);
                router.push(href);
            }}
            onPickAll={() => handleSubmit()}
          />
        </div>
      )}
    </div>
  );
}

// --------------------
// Main Component
// --------------------

export function SearchBar(props: Props) {
  return (
    <div className="w-full mb-8">
      <InstantSearch searchClient={searchClient} indexName={TYPESENSE_COLLECTION}>
        <Configure 
            hitsPerPage={MAX_SUGGESTIONS} 
            {...(SEARCH_CONFIG as any)} 
        />
        <SearchInput value={props.value} onChange={props.onChange} />
      </InstantSearch>
    </div>
  );
}
