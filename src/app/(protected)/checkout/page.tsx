"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  Loader2
} from "lucide-react";
import type {
  CheckoutInit,
  CustomerAddress,
  TrDeliveryDateInfo
} from "@/lib/magento/types.checkout";

// --------------------
// Helpers
// --------------------

type ApiError = { error: string };

function isApiError(v: unknown): v is ApiError {
  return (
    typeof v === "object" &&
    v !== null &&
    "error" in v &&
    typeof (v as { error?: unknown }).error === "string"
  );
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    if (isApiError(json)) throw new Error(json.error);
    throw new Error(`Request failed (${res.status})`);
  }
  if (isApiError(json)) throw new Error(json.error);
  return json as T;
}

function money(v: number, c: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: c }).format(v);
  } catch {
    return `${v.toFixed(2)} ${c}`;
  }
}

function addressLabel(a: CustomerAddress): string {
  const name = [a.firstname, a.lastname].filter(Boolean).join(" ");
  const line1 = a.street?.[0] ?? "";
  const city = a.city ?? "";
  const pc = a.postcode ?? "";
  return [name, line1, city, pc].filter(Boolean).join(" • ");
}

function pickDefaultAddressId(addresses: CustomerAddress[]): number {
  const def = addresses.find((a) => a.default_shipping) ?? addresses[0] ?? null;
  return def?.id ?? 0;
}

function isIsoDate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function formatDateParts(iso: string) {
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    big: dt.toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
    small: dt.toLocaleDateString("en-GB", { weekday: "long", year: "numeric" })
  };
}

async function refreshCartUI() {
  window.dispatchEvent(new Event("cart:changed"));
}

// --------------------
// Calendar Component
// --------------------

function DateCalendar({
  availableDates,
  selectedDate,
  onSelect,
  isLoading
}: {
  availableDates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
  isLoading: boolean;
}) {
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (availableDates.length > 0) {
      const first = new Date(`${availableDates[0]}T00:00:00`);
      if (!Number.isNaN(first.getTime())) setViewDate(first);
    }
  }, [availableDates]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
  const handleNext = () => setViewDate(new Date(year, month + 1, 1));
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden select-none">
      <div className="flex items-center justify-between p-3 bg-muted border-b border-border">
        <button type="button" onClick={handlePrev} className="p-1 hover:bg-accent rounded text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
        <span className="font-semibold text-foreground">{monthName}</span>
        <button type="button" onClick={handleNext} className="p-1 hover:bg-accent rounded text-muted-foreground"><ChevronRight className="w-5 h-5" /></button>
      </div>
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
          <span className="text-xs">Checking availability…</span>
        </div>
      ) : (
        <div className="p-3">
          <div className="grid grid-cols-7 mb-2 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="text-xs font-bold text-muted-foreground">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isAvailable = availableSet.has(isoDate);
              const isSelected = selectedDate === isoDate;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => isAvailable && onSelect(isoDate)}
                  disabled={!isAvailable}
                  className={`h-9 w-full rounded-lg flex items-center justify-center text-sm transition-all ${isSelected ? "bg-primary text-primary-foreground font-bold shadow-md" : isAvailable ? "hover:bg-accent text-foreground font-medium cursor-pointer border border-transparent hover:border-border" : "text-muted-foreground cursor-not-allowed bg-muted/50 opacity-50"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------
// Main Checkout Page
// --------------------

export default function CheckoutPage() {
  const router = useRouter();
  
  // Captcha Ref
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Data State
  const [init, setInit] = useState<CheckoutInit | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Form State
  const [addressId, setAddressId] = useState<number>(0);
  const [poNumber, setPoNumber] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Logic State
  const [deliveryInfo, setDeliveryInfo] = useState<TrDeliveryDateInfo | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const preflightAbortRef = useRef<AbortController | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const cartTotal = init?.cart?.grand_total ?? null;

  const deliveryOptions = useMemo(() => {
    const dates = deliveryInfo?.pattern?.available_dates ?? [];
    return Array.from(new Set(dates)).sort();
  }, [deliveryInfo]);

  const selectedDateParts = useMemo(() => {
    if (!deliveryDate) return null;
    return formatDateParts(deliveryDate);
  }, [deliveryDate]);

  const canPlace = useMemo(() => {
    if (!init || init.addresses.length === 0) return false;
    if (addressId <= 0) return false;
    if (poNumber.trim().length === 0) return false;
    if (deliveryLoading || preflightLoading || placing) return false;
    if (!captchaToken) return false;

    const d = deliveryDate.trim();
    if (!isIsoDate(d)) return false;
    if (!deliveryOptions.includes(d)) return false;

    return true;
  }, [init, addressId, poNumber, deliveryLoading, preflightLoading, placing, deliveryDate, deliveryOptions, captchaToken]);

  // --- Actions ---

  const prepareDelivery = useCallback(async (aid: number) => {
    if (aid <= 0) return;
    setDeliveryLoading(true);
    setDeliveryError(null);
    setDeliveryInfo(null);
    setDeliveryDate("");
    try {
      const delivery = await fetchJson<TrDeliveryDateInfo>("/api/checkout/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address_id: aid })
      });
      setDeliveryInfo(delivery);
    } catch (e: unknown) {
      setDeliveryError(e instanceof Error ? e.message : "Failed to load delivery dates");
    } finally {
      setDeliveryLoading(false);
    }
  }, []);

  const loadInit = useCallback(async () => {
    setInitLoading(true);
    setInitError(null);
    try {
      const payload = await fetchJson<CheckoutInit>("/api/checkout/init");
      setInit(payload);
      const defId = pickDefaultAddressId(payload.addresses);
      setAddressId(defId);
      if (defId > 0) await prepareDelivery(defId);
    } catch (e: unknown) {
      setInit(null);
      setInitError(e instanceof Error ? e.message : "Failed to load checkout");
    } finally {
      setInitLoading(false);
    }
  }, [prepareDelivery]);

  useEffect(() => { void loadInit(); }, [loadInit]);

  const onChangeAddress = useCallback((nextId: number) => {
    setAddressId(nextId);
    setPlaceError(null);
    preflightAbortRef.current?.abort();
    preflightAbortRef.current = null;
    setPreflightLoading(false);
    void prepareDelivery(nextId);
  }, [prepareDelivery]);

  const runPreflight = useCallback(async (aid: number, date: string) => {
    if (aid <= 0 || !isIsoDate(date)) return;
    preflightAbortRef.current?.abort();
    const ac = new AbortController();
    preflightAbortRef.current = ac;
    setPreflightLoading(true);
    try {
      await fetch("/api/checkout/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address_id: aid, delivery_date: date }),
        signal: ac.signal
      });
    } catch { /* swallow */ } finally {
      if (preflightAbortRef.current === ac) {
        preflightAbortRef.current = null;
        setPreflightLoading(false);
      }
    }
  }, []);

  const onSelectDate = useCallback((d: string) => {
    setDeliveryDate(d);
    setPlaceError(null);
    void runPreflight(addressId, d);
  }, [addressId, runPreflight]);

  const placeOrder = useCallback(async () => {
    if (placing) return;
    setPlacing(true);
    setPlaceError(null);
    preflightAbortRef.current?.abort();
    preflightAbortRef.current = null;
    setPreflightLoading(false);

    try {
      const res = await fetchJson<{ ok: true; order_increment_id: string }>("/api/checkout/place", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address_id: addressId,
          po_number: poNumber.trim(),
          delivery_date: deliveryDate.trim(),
          captcha_token: captchaToken
        })
      });

      await refreshCartUI();
      router.refresh();
      router.push(`/orders/${encodeURIComponent(res.order_increment_id)}`);
    } catch (e: unknown) {
      setPlaceError(e instanceof Error ? e.message : "Failed to place order");
      // Reset Captcha on error
      setCaptchaToken(null);
      recaptchaRef.current?.reset();
    } finally {
      setPlacing(false);
    }
  }, [placing, addressId, poNumber, deliveryDate, captchaToken, router]);

  // --- Render ---

  return (
    <main className="relative min-h-[calc(100vh-var(--safe-top)-var(--safe-bottom))] px-4 pb-20 pt-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-[0.25]" />
      
      <div className="mx-auto w-full max-w-none">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Checkout</h1>
            <p className="text-sm text-muted-foreground">Secure checkout via Account.</p>
          </div>
          <Link href="/cart" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
            <ChevronLeft className="w-4 h-4 inline mr-1" /> Back to cart
          </Link>
        </header>

        {initLoading && (
          <div className="w-full h-96 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Initializing checkout…</p>
          </div>
        )}

        {initError && (
          <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
            <h2 className="text-destructive font-bold mb-2">Checkout Error</h2>
            <p className="text-destructive/80 mb-4">{initError}</p>
            <button onClick={() => window.location.reload()} className="underline text-sm text-destructive">Reload Page</button>
          </div>
        )}

        {!initLoading && init && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 grid gap-8">
              
              {/* 1. Address */}
              <section className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">1</div>
                  <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-muted-foreground" /> Delivery Address</h2>
                </div>
                {init.addresses.length === 0 ? (
                  <div className="text-destructive bg-destructive/10 p-4 rounded-xl">No addresses found on your account.</div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Select shipping destination:</label>
                    <select className="w-full rounded-xl border border-border bg-card p-3 text-foreground focus:ring-2 focus:ring-ring" value={addressId} onChange={(e) => onChangeAddress(Number(e.target.value))}>
                      {init.addresses.map((a) => (
                        <option key={a.id} value={a.id}>{a.default_shipping ? "★ " : ""} {addressLabel(a)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </section>

              {/* 2. Delivery Date */}
              <section className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">2</div>
                  <h2 className="text-lg font-bold flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" /> Delivery Date</h2>
                </div>
                {deliveryError ? (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
                    {deliveryError} <button onClick={() => void prepareDelivery(addressId)} className="ml-2 underline font-bold">Retry</button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div><DateCalendar availableDates={deliveryOptions} selectedDate={deliveryDate} onSelect={onSelectDate} isLoading={deliveryLoading} /></div>
                    <div className="flex flex-col justify-center p-4 bg-muted rounded-xl border border-border">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Selected Date</span>
                      {deliveryDate && selectedDateParts ? (
                        <div>
                          <div className="text-2xl font-extrabold text-primary">{selectedDateParts.big}</div>
                          <div className="text-sm text-muted-foreground">{selectedDateParts.small}</div>
                          <div className="mt-3 flex items-center gap-2 text-sm text-primary font-medium"><CheckCircle2 className="w-4 h-4" /> Available</div>
                          {preflightLoading && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin text-primary" /> Checking...</div>}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm italic">Please select an available date.</div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* 3. PO Number */}
              <section className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">3</div>
                  <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-muted-foreground" /> Purchase Order</h2>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">PO Number Reference</label>
                  <input type="text" className="w-full rounded-xl border border-border bg-card p-3 text-foreground focus:ring-2 focus:ring-ring" placeholder="e.g. PO-2026-001" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-2">Required for account invoicing.</p>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-4">
              <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm sticky top-6">
                <h2 className="font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-muted-foreground" /> Order Summary</h2>
                
                <div className="space-y-3 pb-6 border-b border-border text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items Total</span>
                    <span>{cartTotal ? money(cartTotal.value, cartTotal.currency) : "—"}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-4">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-extrabold text-2xl">{cartTotal ? money(cartTotal.value, cartTotal.currency) : "—"}</span>
                </div>

                {placeError && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">{placeError}</div>}

                {/* CAPTCHA WIDGET */}
                <div className="mt-4 mb-4 flex justify-center">
                  {/* @ts-expect-error - Lib types are incompatible with strict React types */}
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                    onChange={(token) => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void placeOrder()}
                  disabled={!canPlace}
                  className={`w-full py-3.5 rounded-xl font-bold shadow-sm transition-all ${canPlace ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                >
                  {placing ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing</span> : "Place Order"}
                </button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">By placing this order you agree to our standard B2B terms of service.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}