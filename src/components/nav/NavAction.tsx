"use client";

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
  label: string;
  iconKey: IconKey;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export default function NavAction({ label, iconKey, onClick, disabled, className }: Props) {
  const Icon = ICONS[iconKey];

  const focus =
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const disabledStyles = disabled ? "opacity-50 pointer-events-none grayscale" : "";

  const base =
    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium outline-none select-none transition-all duration-200 w-full text-left";
  const inactive =
    "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(base, focus, disabledStyles, inactive, className)}
    >
      <Icon
        className={cn("h-5 w-5 text-current transition-transform duration-300 group-hover:scale-105")}
        aria-hidden="true"
      />
      <span className="truncate leading-tight">{label}</span>
    </button>
  );
}
