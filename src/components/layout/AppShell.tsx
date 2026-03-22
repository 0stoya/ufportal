"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import NavLink, { type IconKey } from "@/components/nav/NavLink";
import NavAction from "@/components/nav/NavAction";
import CategoriesPanel from "@/components/nav/CategoriesPanel";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePortalState } from "@/components/layout/PortalStateProvider";
import { useCartStore } from "@/lib/cart/cartStore";

type NavItem = {
  href: string;
  label: string;
  iconKey: IconKey;
  badge?: "cart" | "lists";
  exact?: boolean;
};

const NAV_TOP: NavItem[] = [
  { href: "/dashboard", label: "Home", iconKey: "dashboard", exact: true },
  { href: "/search", label: "Search", iconKey: "search" },
];

const NAV_BOTTOM: NavItem[] = [
  { href: "/cart", label: "Cart", iconKey: "cart", badge: "cart" },
  { href: "/lists", label: "Lists", iconKey: "lists", badge: "lists" },
  { href: "/orders", label: "Orders", iconKey: "orders" },
  { href: "/profile", label: "Profile", iconKey: "profile" },
];

// ✅ Point this to your real logo asset
const LOGO_SRC = "/logo.svg";

function BrandMark() {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative h-16 w-16 shrink-0">
        <Image
          src={LOGO_SRC}
          alt="Storefront"
          fill
          sizes="32px"
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const portal = usePortalState();

  // ✅ Lists badge should be number of lists, not items
  const listsBadgeCount = useMemo(() => {
    const anyPortal = portal as any;
    if (Array.isArray(anyPortal?.lists)) return anyPortal.lists.length;
    return typeof anyPortal?.listsCount === "number" ? anyPortal.listsCount : 0;
  }, [portal]);

  // Cart count comes from the cart store
  const cartCount = useCartStore((s) => s.summary.total_quantity);
  const refreshCart = useCartStore((s) => s.refresh);

  // Load cart summary once so badge appears
  useEffect(() => {
    refreshCart().catch(() => {});
  }, [refreshCart]);

  // ✅ Refresh cart badge when we dispatch `cart:changed`
  useEffect(() => {
    const onCartChanged = () => refreshCart().catch(() => {});
    window.addEventListener("cart:changed", onCartChanged);
    return () => window.removeEventListener("cart:changed", onCartChanged);
  }, [refreshCart]);

  const cartDisabled = false;
  const listsDisabled = false;

  function getBadgeCount(item: NavItem) {
    if (item.badge === "cart") return cartCount;
    if (item.badge === "lists") return listsBadgeCount;
    return undefined;
  }

  function getDisabled(item: NavItem) {
    if (item.badge === "cart") return cartDisabled;
    if (item.badge === "lists") return listsDisabled;
    return false;
  }

  return (
    <div className="min-h-screen md:flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:sticky md:top-0 md:h-screen border-r border-border bg-card z-30">
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <BrandMark />
          <ThemeToggle />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_TOP.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              iconKey={item.iconKey}
              exact={item.exact}
              badgeCount={getBadgeCount(item)}
              disabled={getDisabled(item)}
            />
          ))}

          {/* ✅ Desktop "Categories" drilldown panel as a nav item */}
          <CategoriesPanel
            variant="desktop"
            trigger={(open) => (
              <NavAction label="Categories" iconKey="menu" onClick={open} />
            )}
          />

          {NAV_BOTTOM.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              iconKey={item.iconKey}
              exact={item.exact}
              badgeCount={getBadgeCount(item)}
              disabled={getDisabled(item)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden h-14 border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            {/* ✅ Option B: use CategoriesPanel for mobile too (no CategoriesDrawer mounted) */}
            <CategoriesPanel
              variant="mobile"
              trigger={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Open categories"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
            />
            <BrandMark />
          </div>
          <ThemeToggle />
        </header>

        {/* Content */}
        <main className="flex-1 w-full px-4 md:px-8 py-4 md:py-8 pb-28 md:pb-8">
          {children}
          <InstallPrompt />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="
          md:hidden fixed inset-x-0 bottom-0 z-50
          border-t border-border
          bg-card/95 backdrop-blur-lg
          shadow-[0_-10px_30px_-18px_rgba(0,0,0,.35)]
          rounded-t-2xl
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="mx-auto max-w-md">
          <div className="grid grid-cols-5 px-2 py-2">
            <NavLink mobile href="/dashboard" iconKey="dashboard" label="Home" exact />
            <NavLink mobile href="/search" iconKey="search" label="Search" />
            <NavLink
              mobile
              href="/cart"
              iconKey="cart"
              label="Cart"
              badgeCount={cartCount}
              disabled={cartDisabled}
            />
            <NavLink
              mobile
              href="/lists"
              iconKey="lists"
              label="Lists"
              badgeCount={listsBadgeCount}
              disabled={listsDisabled}
            />
            <NavLink mobile href="/profile" iconKey="profile" label="Account" />
          </div>
        </div>
      </nav>
    </div>
  );
}
