import DashboardPage from "@/components/home/DashboardPage";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_DASHBOARD_CUSTOMER, QUERY_DASHBOARD_CART } from "@/lib/magento/queries";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RespCustomer = { customer: { firstname: string; lastname: string; email: string } };
type RespCart = { customerCart: { id: string; total_quantity: number } };

export default async function Page() {
  const [customerData, cartData] = await Promise.all([
    magentoGraphql<RespCustomer>(
      QUERY_DASHBOARD_CUSTOMER,
      {},
      { requireAuth: true }
    ),
    magentoGraphql<RespCart>(
      QUERY_DASHBOARD_CART,
      {},
      { requireAuth: true }
    ).catch(() => null),
  ]);

  return (
    <DashboardPage
      customer={customerData.customer}
      customerCart={cartData?.customerCart ?? { id: "-", total_quantity: 0 }}
      cartWarning={!cartData}
    />
  );
}
