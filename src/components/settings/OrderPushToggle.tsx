"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { enableOrderPush, disableOrderPush, getOrderPushState } from "@/lib/pwa/orderPush";

type BannerType = { type: "ok" | "err"; text: string } | null;

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Banner({ msg }: { msg: BannerType }) {
  if (!msg) return null;
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm flex items-center gap-2",
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

export default function OrderPushToggle() {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState<BannerType>(null);

  const canUse =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  async function refresh() {
    try {
      setEnabled(await getOrderPushState());
    } catch {
      setEnabled(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onEnable() {
    if (!canUse) return;
    setMsg(null);
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permission not granted");

      await enableOrderPush();
      await refresh();
      setMsg({ type: "ok", text: "Order updates enabled." });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Failed to enable notifications." });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setMsg(null);
    setBusy(true);
    try {
      await disableOrderPush();
      await refresh();
      setMsg({ type: "ok", text: "Order updates disabled." });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Failed to disable notifications." });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Order status updates
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Get a notification when your order status changes.
          </p>
        </div>

        <button
          onClick={enabled ? onDisable : onEnable}
          disabled={!canUse || busy}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
            !canUse || busy
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : enabled
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Working..." : enabled ? "Disable" : "Enable"}
        </button>
      </div>

      <div className="mt-3">
        <Banner msg={msg} />
      </div>

      {!canUse ? (
        <p className="mt-3 text-sm text-amber-700">
          Push notifications aren’t supported in this browser/device.
        </p>
      ) : null}
    </div>
  );
}
