import { ensurePushSubscription, getExistingPushSubscription } from "@/lib/pwa/pushClient";

type PushSubJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function getOrderPushState(): Promise<boolean> {
  // Browser + Magento state are both important.
  const sub = await getExistingPushSubscription();
  if (!sub) return false;

  const res = await fetch("/api/push/status", { cache: "no-store" });
  const json = await res.json().catch(() => null);
  return !!(json && json.enabled);
}

export async function enableOrderPush(): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  if (!vapidPublicKey) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  const sub = await ensurePushSubscription(vapidPublicKey);
  const json = sub.toJSON() as PushSubJSON;

  const endpoint = (json?.endpoint || "").trim();
  const p256dh = (json?.keys?.p256dh || "").trim();
  const auth = (json?.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !auth) throw new Error("Invalid push subscription (missing keys).");

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint,
      p256dh,
      auth,
      content_encoding: "aesgcm",
      user_agent: navigator.userAgent,
    }),
  });

  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.error || "Subscribe failed");
}

export async function disableOrderPush(): Promise<void> {
  const sub = await getExistingPushSubscription();
  if (!sub) return;

  const json = sub.toJSON() as PushSubJSON;
  const endpoint = (json?.endpoint || "").trim();

  // Best effort: deactivate in Magento
  if (endpoint) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  }

  await sub.unsubscribe();
}
