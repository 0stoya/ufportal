import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import {
  MUTATION_SET_SHIPPING_ADDRESS,
  MUTATION_TR_SET_DELIVERY_DATE,
  MUTATION_SET_SHIPPING_METHOD,
} from "@/lib/magento/queries";
import { withAdlabOneRetry } from "@/lib/magento/adlabRetry";

export async function prepShippingAndDelivery(opts: {
  cartId: string;
  addressId: number;
  deliveryDate: string; // YYYY-MM-DD
  carrier: string;
  method: string;
}) {
  const { cartId, addressId, deliveryDate, carrier, method } = opts;

  // 1) address first
  await magentoGraphql(
    MUTATION_SET_SHIPPING_ADDRESS,
    { cartId, addressId },
    { requireAuth: true }
  );

  // 2) set delivery date
  await magentoGraphql(
    MUTATION_TR_SET_DELIVERY_DATE,
    { cartId, date: deliveryDate },
    { requireAuth: true }
  );

  // 3) set shipping method (Adlab may crash first time)
  await withAdlabOneRetry(
    async () =>
      magentoGraphql(
        MUTATION_SET_SHIPPING_METHOD,
        { cartId, carrier, method },
        { requireAuth: true }
      ),
    // prime before retry: re-set date (helps their session/validator timing)
    async () => {
      await magentoGraphql(
        MUTATION_TR_SET_DELIVERY_DATE,
        { cartId, date: deliveryDate },
        { requireAuth: true }
      );
    }
  );
}
