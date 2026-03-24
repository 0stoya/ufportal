import DashboardPage from "@/components/home/DashboardPage";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { QUERY_DASHBOARD_CUSTOMER, QUERY_DASHBOARD_CART } from "@/lib/magento/queries";
import { redirect } from "next/navigation";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RespCustomer = { customer: { firstname: string; lastname: string; email: string } };
type RespCart = { customerCart: { id: string; total_quantity: number } };

export default async function Page() {
  const cartPromise = magentoGraphql<RespCart>(QUERY_DASHBOARD_CART, {}, { requireAuth: true }).catch(() => null);

  let customerData: RespCustomer;

  try {
    customerData = await magentoGraphql<RespCustomer>(QUERY_DASHBOARD_CUSTOMER, {}, { requireAuth: true });
  } catch (e: unknown) {
    if (e instanceof MagentoUnauthorizedError) {
      redirect("/login?next=%2Fdashboard");
    }
    throw e;
  }

  const cartData = await cartPromise;

  return (
    <DashboardPage
      customer={customerData.customer}
      customerCart={cartData?.customerCart ?? { id: "-", total_quantity: 0 }}
      cartWarning={!cartData}
    />
  );
}
