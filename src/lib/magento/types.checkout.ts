export type CustomerAddressRegion = {
  region: string | null;
  region_code: string | null;
  region_id: number | null;
};

export type CustomerAddress = {
  id: number;
  firstname: string | null;
  lastname: string | null;
  company: string | null;
  telephone: string | null;
  street: string[];
  city: string | null;
  postcode: string | null;
  country_code: string | null;

  region: CustomerAddressRegion | null;

  default_shipping: boolean | null;
  default_billing: boolean | null;
};


export type CheckoutCartSummary = {
  id: string; // masked cart id string
  total_quantity: number | null;
  grand_total: { value: number; currency: string } | null;
};

export type TrDeliveryPattern = {
  default_date: string | null;
  available_dates: string[];
};

export type TrDeliveryDateInfo = {
  required: boolean;
  selected_date: string | null;
  is_valid: boolean;
  errors: string[];
  pattern: TrDeliveryPattern;
  suggested_date: string | null;
};

export type CheckoutInit = {
  cart: CheckoutCartSummary;
  addresses: CustomerAddress[];
  delivery: TrDeliveryDateInfo | null;
};
