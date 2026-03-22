"use client";

import type { ReactNode } from "react";
import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2, ChevronRight } from "lucide-react";
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

type ApiResponse = { categories?: NavCategory[] };

function categoryHref(url_path: string) {
  const p = (url_path || "").replace(/^\/+|\/+$/g, "");
  return p ? `/c/${p}` : "/c";
}

export default function CategoriesPanel({
  variant,
  trigger,
}: {
  variant: "desktop" | "mobile";
  trigger?: (open: () => void) => ReactNode;
}) {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState<NavCategory[]>([]);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  const hasLoaded = cats.length > 0;

  // Close whenever any <a> inside the panel is clicked (bulletproof)
  const onPanelClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a");
      if (a) closePanel();
    },
    [closePanel]
  );

  // Fetch categories once (first time opened)
  useEffect(() => {
    if (!open) return;
    if (hasLoaded) return;

    const ac = new AbortController();
    setLoading(true);

    fetch("/api/nav/categories", { signal: ac.signal })
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((json) => setCats(json?.categories ?? []))
      .catch(() => setCats([]))
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [open, hasLoaded]);

  // Close on route change
  useEffect(() => {
    if (!open) return;
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  // Lock body scroll while open (no padding-right shifting)
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus close button when opened
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const top = useMemo(() => cats ?? [], [cats]);

  // Panel sizing/position
  const panelClass =
    variant === "desktop"
      ? "left-64 w-[980px] border-l" // attaches to sidebar edge
      : "left-0 w-[86%] max-w-sm";

  return (
    <>
      {trigger ? (
        trigger(openPanel)
      ) : (
        <button type="button" onClick={openPanel}>
          Categories
        </button>
      )}

      {/* ✅ Only mount overlay when open (prevents layout weirdness) */}
      {open ? (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close categories"
            className="absolute inset-0 bg-black/50"
          />

          {/* Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Categories"
            onClickCapture={onPanelClickCapture}
            className={cn(
              "absolute top-0 h-[100dvh] bg-background shadow-2xl",
              "pb-[env(safe-area-inset-bottom)]",
              panelClass,
              // animation: start slightly off and settle in
              "animate-in slide-in-from-left duration-200"
            )}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="text-sm font-semibold">Categories</div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closePanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="h-[calc(100%-3.5rem)] overflow-hidden">
              {loading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading categories…
                </div>
              ) : top.length ? (
                variant === "desktop" ? (
                  <DesktopDrilldown cats={top} onNavigate={closePanel} />
                ) : (
                  <MobileAccordion cats={top} onNavigate={closePanel} />
                )
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No categories found.</div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

/**
 * Desktop: 3-column drilldown
 */
function DesktopDrilldown({
  cats,
  onNavigate,
}: {
  cats: NavCategory[];
  onNavigate: () => void;
}) {
  const [l1, setL1] = useState<number | null>(cats[0]?.id ?? null);
  const l1Cat = useMemo(() => cats.find((c) => c.id === l1) ?? cats[0], [cats, l1]);

  const l2Cats = l1Cat?.children ?? [];
  const [l2, setL2] = useState<number | null>(l2Cats[0]?.id ?? null);

  useEffect(() => {
    setL2(l2Cats[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l1]);

  const l2Cat = useMemo(() => l2Cats.find((c) => c.id === l2) ?? l2Cats[0], [l2Cats, l2]);
  const l3Cats = l2Cat?.children ?? [];

  return (
    <div className="grid h-full grid-cols-3">
      <div className="border-r border-border overflow-y-auto">
        <ul className="p-2">
          {cats.map((c) => (
            <li key={c.id}>
              <MenuRow
                href={categoryHref(c.url_path)}
                label={c.name}
                active={c.id === l1}
                hasChildren={Boolean(c.children?.length)}
                onHover={() => setL1(c.id)}
                onClick={onNavigate}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-r border-border overflow-y-auto">
        <div className="px-3 pt-3 pb-2">
          {l1Cat ? (
            <Link
              href={categoryHref(l1Cat.url_path)}
              onClick={onNavigate}
              className="text-sm font-semibold hover:underline"
            >
              {l1Cat.name}
            </Link>
          ) : null}
        </div>

        <ul className="p-2 pt-0">
          {l2Cats.length ? (
            l2Cats.map((c) => (
              <li key={c.id}>
                <MenuRow
                  href={categoryHref(c.url_path)}
                  label={c.name}
                  active={c.id === l2}
                  hasChildren={Boolean(c.children?.length)}
                  onHover={() => setL2(c.id)}
                  onClick={onNavigate}
                />
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground">No subcategories</li>
          )}
        </ul>
      </div>

      <div className="overflow-y-auto">
        <div className="px-3 pt-3 pb-2">
          {l2Cat ? (
            <Link
              href={categoryHref(l2Cat.url_path)}
              onClick={onNavigate}
              className="text-sm font-semibold hover:underline"
            >
              {l2Cat.name}
            </Link>
          ) : null}
        </div>

        <ul className="p-2 pt-0">
          {l3Cats.length ? (
            l3Cats.map((c) => (
              <li key={c.id}>
                <MenuRow
                  href={categoryHref(c.url_path)}
                  label={c.name}
                  active={false}
                  hasChildren={Boolean(c.children?.length)}
                  onHover={() => {}}
                  onClick={onNavigate}
                />
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground">No deeper categories</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function MenuRow({
  href,
  label,
  active,
  hasChildren,
  onHover,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  hasChildren: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
        active ? "bg-muted font-semibold" : "hover:bg-muted/60",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <span className="truncate">{label}</span>
      {hasChildren ? <ChevronRight className="h-4 w-4 opacity-70" /> : <span className="w-4" />}
    </Link>
  );
}

/**
 * Mobile: accordion list
 */
function MobileAccordion({
  cats,
  onNavigate,
}: {
  cats: NavCategory[];
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <div className="p-3 space-y-2 overflow-y-auto h-full">
      {cats.map((cat) => {
        const hasKids = Boolean(cat.children?.length);
        const isOpen = Boolean(expanded[cat.id]);

        return (
          <div key={cat.id} className="rounded-xl border bg-card">
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
                  onClick={() => setExpanded((m) => ({ ...m, [cat.id]: !m[cat.id] }))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
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
      })}
    </div>
  );
}
