import ProfilePage from "@/components/profile/ProfilePage";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_PROFILE } from "@/lib/magento/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Address = {
  id: number | string;
  firstname: string;
  lastname: string;
  street: string[];
  city: string;
  postcode: string;
  country_code: string;
  telephone?: string | null;
  region?: { region?: string | null; region_code?: string | null } | null;
  default_billing?: boolean | null;
  default_shipping?: boolean | null;
};

type Resp = {
  customer: {
    firstname: string;
    lastname: string;
    email: string;
    date_of_birth?: string | null;
    gender?: number | null;
    addresses?: Address[] | null;
  };
};

export default async function Page() {
  const data = await magentoGraphql<Resp>(QUERY_PROFILE, {}, { requireAuth: true });
  return <ProfilePage customer={data.customer} />;
}
