import { redirect } from "next/navigation";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_ME } from "@/lib/magento/queries";

export default async function HomePage() {
  try {
    await magentoGraphql(QUERY_ME, {}, { requireAuth: true });
    redirect("/dashboard");
  } catch {
    redirect("/login?next=/dashboard");
  }
}
