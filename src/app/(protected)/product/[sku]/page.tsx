// app/(protected)/product/[sku]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Package, Maximize2, CalendarDays, Info } from "lucide-react";
import { notFound } from "next/navigation";

import { getProductBySku } from "@/lib/magento/products";
import { getMoreFromBrand } from "@/lib/magento/brands";

import AllergenIcons from "./allergen-icons";
import TabbedInfo from "./tabbed-info";
import AddToCart from "./add-to-cart";
import MoreFromBrand from "./more-from-brand";

// ---------- helpers ----------
function normalizeText(input: unknown): string {
  const s = String(input ?? "").trim();
  return s ? s : "";
}

// Expect `bbe` from TR_Portal resolver as "YYYY-MM-DD".
// Still safe if Magento sends "YYYY-MM-DD HH:mm:ss".
function normalizeBbe(raw: unknown): string | null {
  const s = normalizeText(raw);
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function daysUntilYmd(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatBBELabel(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;

  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

function bbeText(ymd: string) {
  const left = daysUntilYmd(ymd);
  const label = formatBBELabel(ymd);

  if (left === null) return `BBE ${label}`;
  if (left <= 0) return `Expired • ${Math.abs(left)}d`;
  return `BBE ${label} • ${left}d`;
}

function bbeTone(left: number | null) {
  if (left === null) return "bg-muted text-muted-foreground border-border";
  if (left <= 0) return "bg-destructive/10 text-destructive border-destructive/20";
  if (left <= 14) return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  if (left <= 120) return "bg-accent text-accent-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
}

// Portal notice card (D1 for D3)
function D1ForD3Notice() {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-accent/60 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-card grid place-items-center border border-border">
          <Info className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-wider uppercase text-primary">
            Please note
          </div>
          <div className="mt-1 text-sm text-foreground font-semibold">
            Lead time for this line is Day 1 for Day 3.
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Plan ordering accordingly for delivery windows.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- page ----------
export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;

  const product = await getProductBySku(sku);
  if (!product) notFound();

  // ✅ TR_Portal fields (fast)
  const units = normalizeText((product as any).units) || null;
  const bbeIso = normalizeBbe((product as any).bbe);

  // You said you already added d1ford3.
  // Support both boolean/int in case your schema returns Int.
  const d1ford3Raw = (product as any).d1ford3;
  const showD1ForD3 = d1ford3Raw === true || Number(d1ford3Raw ?? 0) === 1;

  const dLeft = bbeIso ? daysUntilYmd(bbeIso) : null;
  const showBbe = !!bbeIso && (dLeft === null || dLeft <= 120);

  let brandData: any = null;
  if ((product as any)?.id) {
    try {
      brandData = await getMoreFromBrand((product as any).id);
    } catch {
      brandData = null;
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[500px_1fr] pb-12">
      {/* LEFT */}
      <div>
        <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm cursor-zoom-in">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.18]" />

          {product.small_image?.url ? (
            <>
              <Image
                src={product.small_image.url}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-contain p-8 transition-transform duration-500 ease-in-out group-hover:scale-110"
                priority
              />
              <div className="absolute bottom-4 right-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <div className="bg-card/90 backdrop-blur text-muted-foreground p-2 rounded-full shadow-lg border border-border">
                  <Maximize2 className="h-5 w-5" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              <Package className="h-12 w-12" />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="min-w-0 flex flex-col h-full">
        <div className="mb-6 border-b border-border pb-6">
          <Link
            href="/search"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Search
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-sm font-mono text-muted-foreground">
              SKU: {product.sku}
            </span>

            {units ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
                <Package className="h-4 w-4" /> {units}
              </span>
            ) : null}

            {showBbe && bbeIso ? (
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm font-bold",
                  bbeTone(dLeft),
                ].join(" ")}
                title={bbeIso}
              >
                <CalendarDays className="h-4 w-4" />
                {bbeText(bbeIso)}
              </span>
            ) : null}
          </div>
        </div>

        {/* ✅ D1 for D3 notice (portal only) */}
        {showD1ForD3 ? <D1ForD3Notice /> : null}

        {/* Cart island */}
        <AddToCart product={{ ...(product as any), units }} />

        <div className="space-y-10">
          <AllergenIcons customAttributes={(product as any).custom_attributes} />
          <TabbedInfo sku={product.sku} customAttributes={(product as any).custom_attributes} />
          {brandData && <MoreFromBrand data={brandData} />}
        </div>
      </div>
    </div>
  );
}
