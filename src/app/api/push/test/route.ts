import { NextResponse } from "next/server";
import webpush from "web-push";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_PORTAL_PUSH_ME } from "@/lib/magento/graphql/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sub = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function setupWebPush() {
  webpush.setVapidDetails(
    env("VAPID_SUBJECT"),
    env("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY")
  );
}

export async function POST() {
  try {
    setupWebPush();

    // Fetch current customer's active subscriptions from Magento via GraphQL
    const data = await magentoGraphql<{ portalPushMe: any[] }>(
      QUERY_PORTAL_PUSH_ME,
      {},
      { requireAuth: true }
    );

    const subs: Sub[] = (data.portalPushMe || []).map((s: any) => ({
      endpoint: String(s.endpoint || ""),
      p256dh: String(s.p256dh || ""),
      auth: String(s.auth || ""),
    })).filter(s => s.endpoint && s.p256dh && s.auth);

    if (!subs.length) {
      return NextResponse.json({ ok: false, error: "No active subscriptions for this customer." }, { status: 400 });
    }

    const payload = JSON.stringify({
      title: "UFPortal test notification",
      body: "If you can see this, push sending + service worker are working ✅",
      data: { url: "/profile" },
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          payload
        )
      )
    );

    // Return a small debug summary
    const summary = results.map((r, i) => {
      if (r.status === "fulfilled") return { i, ok: true };
      const err: any = r.reason;
      return {
        i,
        ok: false,
        statusCode: err?.statusCode,
        body: typeof err?.body === "string" ? err.body.slice(0, 300) : err?.body,
        message: err?.message,
      };
    });

    return NextResponse.json({ ok: true, count: subs.length, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Test push failed" }, { status: 500 });
  }
}
