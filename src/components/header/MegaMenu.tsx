// src/components/header/MegaMenu.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NavCategory } from "@/lib/magento/categories";
import { categoryHref } from "@/lib/magento/categories";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  categories: NavCategory[];
  className?: string;
};

export default function MegaMenu({ categories, className }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);

  const top = useMemo(() => categories ?? [], [categories]);

  return (
    <nav className={className}>
      {/* Desktop */}
      <div className="hidden lg:flex items-center gap-1">
        {top.map((cat) => (
          <div
            key={cat.id}
            className="relative"
            onMouseEnter={() => setOpenId(cat.id)}
            onMouseLeave={() => setOpenId((prev) => (prev === cat.id ? null : prev))}
          >
            <Link
              href={categoryHref(cat.url_path)}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand/10"
            >
              {cat.name}
              {cat.children?.length ? <ChevronDown className="h-4 w-4 opacity-70" /> : null}
            </Link>

            {openId === cat.id && cat.children?.length ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-[780px] rounded-2xl border bg-white shadow-xl">
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-6">
                    {cat.children.slice(0, 12).map((lvl2) => (
                      <div key={lvl2.id} className="min-w-0">
                        <Link
                          href={categoryHref(lvl2.url_path)}
                          className="block text-sm font-semibold hover:underline"
                        >
                          {lvl2.name}
                        </Link>

                        {lvl2.children?.length ? (
                          <ul className="mt-2 space-y-1">
                            {lvl2.children.slice(0, 10).map((lvl3) => (
                              <li key={lvl3.id} className="min-w-0">
                                <Link
                                  href={categoryHref(lvl3.url_path)}
                                  className="block truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  {lvl3.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <Link
                      href={categoryHref(cat.url_path)}
                      className="text-sm font-medium hover:underline"
                    >
                      Browse all {cat.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      Tip: we can add promo tiles here (Clearance, New In, etc.)
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Mobile (simple accordion list you can place in your existing mobile menu/drawer) */}
      <div className="lg:hidden">
        <MobileCategoryList categories={top} />
      </div>
    </nav>
  );
}

function MobileCategoryList({ categories }: { categories: NavCategory[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const isOpen = Boolean(open[cat.id]);
        const hasChildren = Boolean(cat.children?.length);

        return (
          <div key={cat.id} className="rounded-xl border bg-white">
            <div className="flex items-center justify-between p-3">
              <Link href={categoryHref(cat.url_path)} className="text-sm font-semibold">
                {cat.name}
              </Link>

              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => setOpen((m) => ({ ...m, [cat.id]: !m[cat.id] }))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>
              ) : null}
            </div>

            {hasChildren && isOpen ? (
              <div className="border-t p-3">
                <div className="space-y-2">
                  {cat.children.map((lvl2) => (
                    <div key={lvl2.id}>
                      <Link
                        href={categoryHref(lvl2.url_path)}
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
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
