"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, X, ChevronRight, Loader2 } from "lucide-react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NavCategory = {
  id: number;
  name: string;
  url_path: string;
  children: NavCategory[];
};

function categoryHref(url_path: string) {
  const p = (url_path || "").replace(/^\/+|\/+$/g, "");
  return p ? `/c/${p}` : "/c";
}

type ApiResponse = { categories?: NavCategory[] };

export default function CategoriesDrawer() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  const toggleExpanded = useCallback((id: number) => {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  }, []);

  const hasLoaded = categories.length > 0;

  // 1) Fetch categories (once) when opening
  useEffect(() => {
    if (!open) return;
    if (hasLoaded) return;

    const ac = new AbortController();
    setLoading(true);

    fetch("/api/nav/categories", { signal: ac.signal })
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((json) => setCategories(json?.categories ?? []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [open, hasLoaded]);

  // 2) Lock body scroll while open (fixes background scroll / scrollbar)
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift when scrollbar disappears (desktop)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  // 3) Close on route change (prevents drawer staying open after navigation)
  useEffect(() => {
    if (!open) return;
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 4) ESC closes
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeDrawer]);

  // 5) Focus close button when opened (basic a11y)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const top = useMemo(() => categories ?? [], [categories]);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Open categories"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Modal layer */}
      <div
        className={cn(
          "fixed inset-0 z-[100]",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close categories"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0"
          )}
          tabIndex={open ? 0 : -1}
        />

        {/* Panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Categories"
          className={cn(
            "absolute left-0 top-0 h-[100dvh] w-[86%] max-w-sm bg-background shadow-2xl",
            "pb-[env(safe-area-inset-bottom)]",
            "transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="text-sm font-semibold">Categories</div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeDrawer}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Close"
              tabIndex={open ? 0 : -1}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading categories…
              </div>
            ) : top.length ? (
              <div className="space-y-2">
                {top.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    isOpen={Boolean(expanded[cat.id])}
                    onToggle={() => toggleExpanded(cat.id)}
                    onNavigate={closeDrawer}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">No categories found.</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function CategoryCard({
  cat,
  isOpen,
  onToggle,
  onNavigate,
}: {
  cat: NavCategory;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const hasKids = Boolean(cat.children?.length);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-3">
        <Link
          href={categoryHref(cat.url_path)}
          onClick={onNavigate}
          className="min-w-0 text-sm font-semibold"
        >
          <span className="block truncate">{cat.name}</span>
        </Link>

        {hasKids ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-90" : "")}
            />
          </button>
        ) : null}
      </div>

      {hasKids && isOpen ? (
        <div className="border-t p-3 space-y-2">
          {cat.children.map((lvl2) => (
            <div key={lvl2.id}>
              <Link
                href={categoryHref(lvl2.url_path)}
                onClick={onNavigate}
                className="block text-sm font-medium hover:underline"
              >
                {lvl2.name}
              </Link>

              {lvl2.children?.length ? (
                <div className="mt-1 space-y-1 pl-3">
                  {lvl2.children.map((lvl3) => (
                    <Link
                      key={lvl3.id}
                      href={categoryHref(lvl3.url_path)}
                      onClick={onNavigate}
                      className="block text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {lvl3.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
