"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  LayoutDashboard,
  ShoppingBag,
  Search,
  User,
  Menu,
  ShoppingCart,
  ListChecks,
} from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type IconKey =
  | "dashboard"
  | "orders"
  | "search"
  | "profile"
  | "menu"
  | "cart"
  | "lists";

const ICONS: Record<IconKey, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  search: Search,
  profile: User,
  menu: Menu,
  cart: ShoppingCart,
  lists: ListChecks,
};

type Props = {
  href: string;
  label: string;
  iconKey: IconKey;
  mobile?: boolean;
  exact?: boolean;
  badgeCount?: number;
  disabled?: boolean;
  className?: string;
};

function isActivePath(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function formatBadge(n: number) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

export default function NavLink({
  href,
  label,
  iconKey,
  mobile = false,
  exact = false,
  badgeCount,
  disabled = false,
  className,
}: Props) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href, exact);
  const Icon = ICONS[iconKey];

  const badge = typeof badgeCount === "number" ? formatBadge(badgeCount) : null;
  const badgeAria =
    badge && typeof badgeCount === "number" ? `${badgeCount} items` : undefined;

  // Shared
  const focus =
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const disabledStyles = disabled ? "opacity-50 pointer-events-none grayscale" : "";

  // Desktop (keep your existing vibe)
  const desktopBase =
    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium outline-none select-none transition-all duration-200";
  const desktopActive =
    "bg-background text-primary ring-1 ring-primary shadow-sm";
  const desktopInactive =
    "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent";

  // Mobile (tab-bar: no borders/rings per item)
  const mobileBase =
    "group relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-h-[60px] text-[10px] font-medium outline-none select-none transition-colors";
  const mobileActive = "text-primary";
  const mobileInactive = "text-muted-foreground hover:text-foreground";

  const base = mobile ? mobileBase : desktopBase;
  const state = mobile
    ? active
      ? mobileActive
      : mobileInactive
    : active
      ? desktopActive
      : desktopInactive;

  return (
  <Link
    href={href}
    aria-current={active ? "page" : undefined}
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : 0}
    className={cn(base, focus, disabledStyles, state, className, "relative")}
  >
    {mobile ? (
      <>
        {/* Mobile badge: top-right of the tab item */}
        {badge && (
          <span
            className={cn(
              "absolute top-1 right-2 flex items-center justify-center rounded-full text-[10px] font-bold leading-none",
              "min-w-[18px] h-[18px] px-1",
              "ring-2 ring-card",
              "bg-primary text-primary-foreground"
            )}
            aria-label={badgeAria}
            role="status"
          >
            {badge}
          </span>
        )}

        <Icon
          className={cn(
            "transition-transform duration-300 group-hover:scale-105",
            "h-6 w-6",
            "text-current"
          )}
          aria-hidden="true"
        />

        <span className={cn("truncate leading-tight max-w-[72px]")}>{label}</span>

        {/* Mobile active indicator */}
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 h-1 w-1 rounded-full transition-opacity",
            active ? "bg-primary opacity-100" : "opacity-0"
          )}
        />
      </>
    ) : (
      <>
        {/* Desktop row: icon + label left, badge right */}
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Icon
              className={cn(
                "transition-transform duration-300 group-hover:scale-105",
                "h-5 w-5",
                "text-current"
              )}
              aria-hidden="true"
            />
            <span className="truncate leading-tight">{label}</span>
          </div>

          {badge && (
            <span
              className={cn(
                "flex items-center justify-center rounded-full text-[10px] font-bold leading-none",
                "min-w-[20px] h-[20px] px-1.5",
                "bg-primary text-primary-foreground"
              )}
              aria-label={badgeAria}
              role="status"
            >
              {badge}
            </span>
          )}
        </div>
      </>
    )}
  </Link>
);

}
