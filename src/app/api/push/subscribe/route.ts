import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { MUTATION_PORTAL_PUSH_SUBSCRIBE } from "@/lib/magento/graphql/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  endpoint: string;
  p256dh: string;
  auth: string;
  content_encoding?: string | null;
  user_agent?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const endpoint = String(body?.endpoint || "").trim();
    const p256dh = String(body?.p256dh || "").trim();
    const auth = String(body?.auth || "").trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing endpoint/p256dh/auth" }, { status: 400 });
    }

    const data = await magentoGraphql(
      MUTATION_PORTAL_PUSH_SUBSCRIBE,
      {
        input: {
          endpoint,
          p256dh,
          auth,
          content_encoding: body.content_encoding ?? "aesgcm",
          user_agent: body.user_agent ?? null,
        },
      },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Subscribe failed" }, { status: 500 });
  }
}
