import { NextResponse } from "next/server";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Incoming = {
  customer_id: number;
  increment_id: string;
  old_status?: string | null;
  new_status: string;
  subscriptions: Array<{
    endpoint: string;
    p256dh: string;
    auth: string;
    content_encoding?: string | null;
  }>;
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

export async function POST(req: Request) {
  try {
    const secret = env("PORTAL_PUSH_WEBHOOK_SECRET");
    const got = req.headers.get("x-portal-secret");
    if (got !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Incoming;

    if (!body?.increment_id || !body?.new_status || !Array.isArray(body.subscriptions)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    setupWebPush();

    const payload = JSON.stringify({
      title: `Order ${body.increment_id} updated`,
      body: `Status changed to: ${body.new_status}`,
      data: { url: `/orders/${body.increment_id}` },
    });

    const results = await Promise.allSettled(
      body.subscriptions.map((s) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          } as any,
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    // Optional: later we can return which endpoints failed so Magento can deactivate them.
    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
