/// <reference lib="webworker" />

// Import Workbox modules
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

// 1. PRECACHING
// ---------------------------------------------------------------------------
cleanupOutdatedCaches();

// Fix: Remove the @ts-expect-error comment
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

// 2. PUSH NOTIFICATIONS
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  const data = event.data ? safeJson(event.data) : null;

  const title = data?.title ?? "UFPortal";
  const options: NotificationOptions = {
    body: data?.body ?? "Update",
    icon: data?.icon ?? "/icons/TR_Favicon_192.png",
    badge: data?.badge ?? "/icons/TR_Favicon_192.png",
    data: data?.data ?? {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data &&
    typeof event.notification.data === "object" &&
    "url" in event.notification.data &&
    typeof (event.notification.data as any).url === "string"
      ? (event.notification.data as any).url
      : "/orders") as string;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if ("navigate" in client && client.focus) {
          await client.focus();
          try {
            await client.navigate(targetUrl);
          } catch {
            // ignore
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// ---- Helpers ----
function safeJson(data: PushMessageData): any | null {
  try {
    return data.json();
  } catch {
    try {
      return JSON.parse(data.text());
    } catch {
      return null;
    }
  }
}