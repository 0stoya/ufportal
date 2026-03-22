import { redirect } from "next/navigation";
import { getCustomerToken } from "@/lib/auth/cookies";

export default async function HomePage() {
  const token = await getCustomerToken();

  if (token) {
    redirect("/dashboard");
  }

  redirect("/login?next=/dashboard");
}
