"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  Save,
  RefreshCw,
  LogOut,
  BadgeCheck,
  KeyRound,
  MapPin,
  Phone,
  Lock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  BellOff
} from "lucide-react";
import { ensurePushSubscription, getExistingPushSubscription } from "@/lib/pwa/pushClient";

// --- Types ---
type CustomerAddress = {
  id: number | string;
  firstname: string;
  lastname: string;
  street: string[];
  city: string;
  postcode: string;
  country_code: string;
  telephone?: string | null;
  region?: { region?: string | null; region_code?: string | null } | null;
  default_billing?: boolean | null;
  default_shipping?: boolean | null;
};

type Customer = {
  firstname: string;
  lastname: string;
  email: string;
  addresses?: CustomerAddress[] | null;
};

type BannerType = { type: "ok" | "err"; text: string } | null;

// --- Helpers ---
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatAddressLines(a: CustomerAddress) {
  const lines: string[] = [];
  const street = (a.street ?? []).filter(Boolean);
  lines.push(...street);

  const cityLine = [a.city, a.region?.region, a.postcode].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);

  if (a.country_code) lines.push(a.country_code);
  return lines;
}

function toNumberId(id: unknown): number | undefined {
  const n = typeof id === "string" ? Number(id) : typeof id === "number" ? id : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function postJson<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      json?.error ||
      json?.message ||
      (text && text.trim() ? text.trim() : "Request failed");
    throw new Error(msg);
  }

  return (json ?? (text as any)) as T;
}



async function getJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Request failed");
  return json as T;
}

// --- UI Bits ---
function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  className
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Banner({ msg }: { msg: BannerType }) {
  if (!msg) return null;
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm flex items-center gap-2 mb-4",
        msg.type === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
    >
      {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg.text}
    </div>
  );
}

// --- Page ---
export default function ProfilePage({ customer }: { customer: Customer }) {
  const router = useRouter();

  // ---- Profile state
  const initial = useMemo(
    () => ({
      firstname: customer.firstname ?? "",
      lastname: customer.lastname ?? ""
    }),
    [customer.firstname, customer.lastname]
  );

  const [profile, setProfile] = useState(initial);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<BannerType>(null);

  // keep in sync if server refresh updates names
  useEffect(() => setProfile(initial), [initial]);

  const profileDirty = profile.firstname !== initial.firstname || profile.lastname !== initial.lastname;

  // ---- Password state
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<BannerType>(null);
  const canChangePw = !!pw.current && !!pw.next && !!pw.confirm;

  // ---- Address state
  const [addrBusyKey, setAddrBusyKey] = useState<string | null>(null);

  const addresses = useMemo(() => {
    const list = (customer.addresses ?? []).slice();
    list.sort((a, b) => {
      const aScore = (a.default_shipping ? 2 : 0) + (a.default_billing ? 1 : 0);
      const bScore = (b.default_shipping ? 2 : 0) + (b.default_billing ? 1 : 0);
      return bScore - aScore;
    });
    return list;
  }, [customer.addresses]);

  // ---- Push (Order status notifications)
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMsg, setPushMsg] = useState<BannerType>(null);

  const pushSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const refresh = useCallback(() => router.refresh(), [router]);

  const loadPushStatus = useCallback(async () => {
    if (!pushSupported) {
      setPushEnabled(false);
      return;
    }
    try {
      const browserSub = await getExistingPushSubscription();
      const status = await getJson<{ enabled?: boolean }>("/api/push/status").catch(() => ({ enabled: false }));
      setPushEnabled(!!browserSub && !!status?.enabled);
    } catch {
      setPushEnabled(false);
    }
  }, [pushSupported]);

  useEffect(() => {
    loadPushStatus();
  }, [loadPushStatus]);

  const onEnablePush = useCallback(async () => {
    setPushMsg(null);
    if (!pushSupported) {
      setPushMsg({ type: "err", text: "Push notifications are not supported in this browser." });
      return;
    }

    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Notification permission not granted.");

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapid) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");

      const sub = await ensurePushSubscription(vapid);
      const json = sub.toJSON() as any;

      const endpoint = String(json?.endpoint || "").trim();
      const p256dh = String(json?.keys?.p256dh || "").trim();
      const auth = String(json?.keys?.auth || "").trim();

      if (!endpoint || !p256dh || !auth) throw new Error("Invalid subscription keys.");

      await postJson("/api/push/subscribe", {
        endpoint,
        p256dh,
        auth,
        content_encoding: "aesgcm",
        user_agent: navigator.userAgent
      });

      setPushMsg({ type: "ok", text: "Order status notifications enabled." });
      await loadPushStatus();
    } catch (e: any) {
      setPushMsg({ type: "err", text: e?.message ?? "Failed to enable notifications." });
      await loadPushStatus();
    } finally {
      setPushBusy(false);
    }
  }, [loadPushStatus, pushSupported]);

  const onDisablePush = useCallback(async () => {
    setPushMsg(null);
    setPushBusy(true);
    try {
      const sub = await getExistingPushSubscription();
      if (sub) {
        const json = sub.toJSON() as any;
        const endpoint = String(json?.endpoint || "").trim();

        if (endpoint) await postJson("/api/push/unsubscribe", { endpoint }).catch(() => {});
        await sub.unsubscribe();
      }

      setPushMsg({ type: "ok", text: "Order status notifications disabled." });
      await loadPushStatus();
    } catch (e: any) {
      setPushMsg({ type: "err", text: e?.message ?? "Failed to disable notifications." });
      await loadPushStatus();
    } finally {
      setPushBusy(false);
    }
  }, [loadPushStatus]);

  // ---- Actions
  const onSaveProfile = useCallback(async () => {
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      await postJson("/api/profile/update", {
        firstname: profile.firstname,
        lastname: profile.lastname
      });
      setProfileMsg({ type: "ok", text: "Profile updated successfully." });
      refresh();
    } catch (e: any) {
      setProfileMsg({ type: "err", text: e?.message ?? "Update failed" });
    } finally {
      setProfileSaving(false);
    }
  }, [profile.firstname, profile.lastname, refresh]);

  const onChangePassword = useCallback(async () => {
    setPwMsg(null);
    setPwSaving(true);
    try {
      await postJson("/api/profile/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
        confirmPassword: pw.confirm
      });
      setPwMsg({ type: "ok", text: "Password updated successfully." });
      setPw({ current: "", next: "", confirm: "" });
    } catch (e: any) {
      setPwMsg({ type: "err", text: e?.message ?? "Password change failed" });
    } finally {
      setPwSaving(false);
    }
  }, [pw]);

  const onLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    try {
      localStorage.removeItem("cart_id");
      localStorage.removeItem("magento_cart_id");
    } catch {}
    router.replace("/login?loggedOut=1");
  }, [router]);

  const deleteAddress = useCallback(
    async (id: number) => {
      if (!confirm("Are you sure you want to delete this address?")) return;
      setAddrBusyKey(`delete:${id}`);
      try {
        await postJson("/api/profile/address/delete", { id });
        refresh();
      } catch (e: any) {
        alert(e?.message ?? "Delete failed");
      } finally {
        setAddrBusyKey(null);
      }
    },
    [refresh]
  );

  const setDefault = useCallback(
    async (id: number, kind: "shipping" | "billing") => {
      setAddrBusyKey(`default:${kind}:${id}`);
      try {
        await postJson("/api/profile/address/set-default", { id, kind });
        refresh();
      } catch (e: any) {
        alert(e?.message ?? "Set default failed");
      } finally {
        setAddrBusyKey(null);
      }
    },
    [refresh]
  );

  return (
    <div className="mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="mt-1 text-slate-500">Manage your personal details and account settings.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 hover:border-red-100 transition-colors"
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-8">
          {/* User Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
              <User className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {customer.firstname} {customer.lastname}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              <span>{customer.email}</span>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-100 justify-center">
                <BadgeCheck className="h-4 w-4" />
                <span>Account Active</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 border border-slate-100 justify-center">
                <Shield className="h-4 w-4" />
                <span>Secure Session</span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <SectionCard title="Security" subtitle="Update your password." icon={<KeyRound className="h-5 w-5" />}>
            <div className="space-y-4">
              <Banner msg={pwMsg} />

              <Field
                label="Current Password"
                type="password"
                value={pw.current}
                onChange={(v) => setPw((s) => ({ ...s, current: v }))}
              />
              <Field
                label="New Password"
                type="password"
                value={pw.next}
                onChange={(v) => setPw((s) => ({ ...s, next: v }))}
              />
              <Field
                label="Confirm Password"
                type="password"
                value={pw.confirm}
                onChange={(v) => setPw((s) => ({ ...s, confirm: v }))}
              />

              <button
                type="button"
                onClick={onChangePassword}
                disabled={pwSaving || !canChangePw}
                className={cx(
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all",
                  pwSaving || !canChangePw
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {pwSaving ? "Updating..." : "Update Password"}
              </button>

              <div className="text-xs text-slate-500 text-center">
                Use at least 8 characters with numbers & symbols.
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Details */}
          <SectionCard
            title="Personal Information"
            subtitle="Manage your basic profile details."
            icon={<User className="h-5 w-5" />}
            action={
              <button
                onClick={onSaveProfile}
                disabled={!profileDirty || profileSaving}
                className={cx(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all",
                  !profileDirty || profileSaving
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
                type="button"
              >
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            }
          >
            <div className="space-y-6">
              <Banner msg={profileMsg} />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field
                  label="First Name"
                  value={profile.firstname}
                  onChange={(v) => setProfile((s) => ({ ...s, firstname: v }))}
                  autoComplete="given-name"
                />
                <Field
                  label="Last Name"
                  value={profile.lastname}
                  onChange={(v) => setProfile((s) => ({ ...s, lastname: v }))}
                  autoComplete="family-name"
                />

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed">
                    {customer.email}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Contact support to change email.</p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard
            title="Notifications"
            subtitle="Order status push notifications for this device."
            icon={pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            action={
              <button
                onClick={pushEnabled ? onDisablePush : onEnablePush}
                disabled={pushBusy || !pushSupported}
                className={cx(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all",
                  pushBusy || !pushSupported
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : pushEnabled
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                )}
                type="button"
              >
                {pushBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : pushEnabled ? (
                  <BellOff className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {pushBusy ? "Working..." : pushEnabled ? "Disable" : "Enable"}
              </button>
            }
          >
            <div className="space-y-4">
              <Banner msg={pushMsg} />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold mb-1">Order status updates</div>
                <p className="text-slate-600">
                  When enabled, you’ll receive a notification on this device when your order status changes.
                </p>

                {!pushSupported ? (
                  <p className="mt-2 text-amber-700">
                    Push notifications aren’t supported in this browser/device.
                  </p>
                ) : null}

              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-600">Status</div>
                <div className={cx("font-medium", pushEnabled ? "text-emerald-700" : "text-slate-500")}>
                  {pushEnabled ? "Enabled on this device" : "Disabled"}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Address Book (read-only: no add/edit) */}
          <SectionCard
            title="Address Book"
            subtitle="Saved addresses (editing disabled)."
            icon={<MapPin className="h-5 w-5" />}
          >
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
                <MapPin className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No addresses saved yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {addresses.map((a) => {
                  const idNum = toNumberId(a.id) ?? 0;
                  const deleteBusy = addrBusyKey === `delete:${idNum}`;
                  const shipBusy = addrBusyKey === `default:shipping:${idNum}`;
                  const billBusy = addrBusyKey === `default:billing:${idNum}`;

                  return (
                    <div
                      key={String(a.id)}
                      className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-slate-900">
                            {a.firstname} {a.lastname}
                          </div>

                          <button
                            onClick={() => deleteAddress(idNum)}
                            disabled={deleteBusy || !idNum}
                            className={cx(
                              "p-1.5 rounded transition-colors",
                              deleteBusy || !idNum
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            )}
                            title="Delete"
                            type="button"
                          >
                            {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="mt-2 space-y-0.5 text-sm text-slate-600 leading-relaxed">
                          {formatAddressLines(a).map((line, idx) => (
                            <div key={idx} className="truncate">
                              {line}
                            </div>
                          ))}
                        </div>

                        {a.telephone && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{a.telephone}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                        {a.default_shipping ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="h-3 w-3" /> Default Shipping
                          </span>
                        ) : (
                          <button
                            onClick={() => setDefault(idNum, "shipping")}
                            disabled={shipBusy || !idNum}
                            className={cx(
                              "text-xs font-medium transition-colors",
                              shipBusy || !idNum
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-400 hover:text-blue-600"
                            )}
                            type="button"
                          >
                            {shipBusy ? "Setting..." : "Set as Shipping"}
                          </button>
                        )}

                        {a.default_billing ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                            <CheckCircle2 className="h-3 w-3" /> Default Billing
                          </span>
                        ) : (
                          <button
                            onClick={() => setDefault(idNum, "billing")}
                            disabled={billBusy || !idNum}
                            className={cx(
                              "text-xs font-medium transition-colors",
                              billBusy || !idNum
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-400 hover:text-blue-600"
                            )}
                            type="button"
                          >
                            {billBusy ? "Setting..." : "Set as Billing"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
