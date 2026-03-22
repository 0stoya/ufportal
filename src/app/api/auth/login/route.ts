import { NextResponse } from "next/server";
import { setCustomerToken } from "@/lib/auth/cookies";
import { magentoFetch } from "@/lib/magento/client";

const GENERATE_CUSTOMER_TOKEN = /* GraphQL */ `
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;

  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Missing credentials" }, { status: 400 });
  }

  try {
    const data = await magentoFetch<{ generateCustomerToken: { token: string } }>(
      GENERATE_CUSTOMER_TOKEN,
      { email, password },
      null // no bearer needed to login
    );

    await setCustomerToken(data.generateCustomerToken.token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid login" }, { status: 401 });
  }
}
