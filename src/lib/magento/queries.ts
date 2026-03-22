const CART_FIELDS = /* GraphQL */ `
  id
  total_quantity
  items {
    id
    quantity
    prices {
      row_total { value currency }
      row_total_including_tax { value currency }
      total_item_discount { value currency }
    }
    product {
      sku
      name
      small_image { url }
      custom_attributes {
  attribute_metadata { code label }
  entered_attribute_value { value }
}
      resolved_price {
        custom { value_incl_tax value_excl_tax currency }
        standard { value_incl_tax value_excl_tax currency }
      }
    }
  }
  prices {
    subtotal_excluding_tax { value currency }
    subtotal_including_tax { value currency }

    # recommended: totals after discounts (Magento varies by config)

    applied_taxes { label amount { value currency } }
    discounts { label amount { value currency } }
    grand_total { value currency }
  }
`;



export const MUTATION_LOGIN = /* GraphQL */ `
  mutation Login($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;

export const QUERY_ME = /* GraphQL */ `
  query Me {
    customer {
      firstname
      lastname
      email
      # include your custom attribute if you want it here
      # custom_attributes { attribute_code value }
    }
    customerCart {
      id
      total_quantity
    }
  }
`;
export const QUERY_PRODUCTS = /* GraphQL */ `
  query Products($search: String!, $pageSize: Int = 20, $currentPage: Int = 1) {
    products(search: $search, pageSize: $pageSize, currentPage: $currentPage) {
      items {
  id
  sku
  name
  units
  bbe
  featured_product
  m_special_price
  small_image { url }
  resolved_price { custom { value_incl_tax value_excl_tax currency } standard { value_incl_tax value_excl_tax currency } }
}
      total_count
      page_info { current_page total_pages }
    }
  }
`;


export const MUTATION_ADD_SIMPLE_TO_CART = /* GraphQL */ `
  mutation AddSimple($cartId: String!, $sku: String!, $qty: Float!) {
    addSimpleProductsToCart(
      input: { cart_id: $cartId, cart_items: [{ data: { sku: $sku, quantity: $qty } }] }
    ) {
      cart {
        ${CART_FIELDS}
      }
    }
  }
`;

export const QUERY_CART_ID = /* GraphQL */ `
  query CartId {
    customerCart {
      id
      total_quantity
    }
  }
`;
export const QUERY_PRODUCTS_BY_SKU_EQ = /* GraphQL */ `
  query ProductsBySkuEq($sku: String!, $pageSize: Int = 20) {
    products(filter: { sku: { eq: $sku } }, pageSize: $pageSize, currentPage: 1) {
      items {
        __typename
        id
        sku
        name
        small_image { url }
        custom_attributes {
    attribute_metadata { code label }
    entered_attribute_value { value }
  }
        resolved_price {
          custom { value_incl_tax value_excl_tax currency }
          standard { value_incl_tax value_excl_tax currency }
        }
      }
      total_count
      page_info { current_page total_pages }
    }
  }
`;

export const QUERY_PRODUCTS_BY_SKU_MATCH = /* GraphQL */ `
  query ProductsBySkuMatch($sku: String!, $pageSize: Int = 20) {
    products(filter: { sku: { match: $sku } }, pageSize: $pageSize, currentPage: 1) {
      items {
        __typename
        id
        sku
        name
        small_image { url }
        resolved_price {
          custom { value_incl_tax value_excl_tax currency }
          standard { value_incl_tax value_excl_tax currency }
        }
      }
      total_count
      page_info { current_page total_pages }
    }
  }
`;

export const QUERY_CUSTOMER_ORDERS = /* GraphQL */ `
  query CustomerOrders($pageSize: Int = 20, $currentPage: Int = 1) {
    customer {
      orders(
      pageSize: $pageSize
      currentPage: $currentPage
      sort: { sort_field: CREATED_AT, sort_direction: DESC }
    ) {
        total_count
        page_info {
          current_page
          page_size
          total_pages
        }
        items {
          id
          increment_id
          created_at  # <--- MUST ADD THIS FIELD
          tr_delivery {
          date
        }
          order_date
          status
          shipping_method
          payment_methods {
            name
          }
          total {
            grand_total {
              value
              currency
            }
          }
        }
      }
    }
  }
`;
export const QUERY_CUSTOMER_ORDER_DETAIL = /* GraphQL */ `
  query CustomerOrderDetail($number: String!) {
    customer {
      orders(filter: { number: { eq: $number } }) {
        items {
          id
          number
          increment_id
          created_at
          order_date
          status
          shipping_method
          tr_delivery { date }

          payment_methods { name }

          total {
            grand_total { value currency }
            subtotal { value currency }
            total_tax { value currency }
            total_shipping { value currency }  # optional but useful
            discounts { amount { value currency } label } # optional
          }

          items {
            id
            product_name
            product_sku
            quantity_ordered
            prices {
              row_total { value currency }
              row_total_including_tax { value currency }
              total_item_discount { value currency }
            }
          }
        }
      }
    }
  }
`;

export const QUERY_CART = /* GraphQL */ `
  query CustomerCart {
    customerCart {
      ${CART_FIELDS}
    }
  }
`;


export const MUTATION_UPDATE_CART_ITEMS = /* GraphQL */ `
  mutation UpdateCartItems($cartId: String!, $cartItemId: Int!, $quantity: Float!) {
    updateCartItems(
      input: {
        cart_id: $cartId
        cart_items: [{ cart_item_id: $cartItemId, quantity: $quantity }]
      }
    ) {
      cart {
        ${CART_FIELDS}
      }
    }
  }
`;


export const MUTATION_REMOVE_ITEM_FROM_CART = /* GraphQL */ `
  mutation RemoveItem($cartId: String!, $cartItemId: Int!) {
    removeItemFromCart(input: { cart_id: $cartId, cart_item_id: $cartItemId }) {
      cart {
        ${CART_FIELDS}
      }
    }
  }
`;

// --- Checkout init ---
export const QUERY_CUSTOMER_ADDRESSES = /* GraphQL */ `
  query CustomerAddresses {
    customer {
      firstname
      lastname
      addresses {
        id
        firstname
        lastname
        company
        telephone
        street
        city
        postcode
        country_code
        default_shipping
        default_billing
        region {
          region
          region_code
          region_id
        }
      }
    }
  }
`;

export const QUERY_CHECKOUT_CART_SUMMARY = /* GraphQL */ `
  query CheckoutCartSummary {
    customerCart {
      id
      total_quantity
      prices {
        grand_total {
          value
          currency
        }
      }
    }
  }
`;

// --- Set shipping address ---
export const MUTATION_SET_SHIPPING_ADDRESS = /* GraphQL */ `
  mutation SetShippingAddress($cartId: String!, $addressId: Int!) {
    setShippingAddressesOnCart(
      input: { cart_id: $cartId, shipping_addresses: [{ customer_address_id: $addressId }] }
    ) {
      cart {
        id
      }
    }
  }
`;

// --- Set shipping method (single method) ---
export const MUTATION_SET_SHIPPING_METHOD = /* GraphQL */ `
  mutation SetShippingMethod($cartId: String!, $carrier: String!, $method: String!) {
    setShippingMethodsOnCart(
      input: { cart_id: $cartId, shipping_methods: [{ carrier_code: $carrier, method_code: $method }] }
    ) {
      cart {
        id
      }
    }
  }
`;

// --- Delivery date (your custom resolvers) ---
export const QUERY_TR_DELIVERY_DATE = /* GraphQL */ `
  query TrDeliveryDate($cartId: String!) {
    trDeliveryDate(cart_id: $cartId) {
      required
      selected_date
      is_valid
      errors
      pattern {
        default_date
        available_dates
      }
      suggested_date
    }
  }
`;

export const MUTATION_TR_SET_DELIVERY_DATE = /* GraphQL */ `
  mutation TrSetDeliveryDate($cartId: String!, $date: String!) {
    trSetDeliveryDate(cart_id: $cartId, date: $date)
  }
`;

export const MUTATION_TR_APPLY_SUGGESTED_DELIVERY_DATE = /* GraphQL */ `
  mutation TrApplySuggestedDeliveryDate($cartId: String!) {
    trApplySuggestedDeliveryDate(cart_id: $cartId)
  }
`;

// --- Payment: purchase order ---
// NOTE: Different Magento builds expose PO number differently.
// We try the most common shape; if your schema differs, paste the error and I’ll adjust instantly.
export const MUTATION_SET_PAYMENT_METHOD_PURCHASEORDER = /* GraphQL */ `
  mutation SetPaymentMethodPO($cartId: String!, $poNumber: String!) {
    setPaymentMethodOnCart(
      input: {
        cart_id: $cartId
        payment_method: { code: "purchaseorder", purchase_order_number: $poNumber }
      }
    ) {
      cart {
        id
      }
    }
  }
`;

// --- Place order ---
export const MUTATION_PLACE_ORDER = /* GraphQL */ `
  mutation PlaceOrder($cartId: String!) {
    placeOrder(input: { cart_id: $cartId }) {
      order {
        order_number
      }
    }
  }
`;
export const QUERY_CUSTOMER_SHOPPING_LISTS = /* GraphQL */ `
  query CustomerShoppingLists {
    customerShoppingLists {
      list_id
      list_name
      items_count
    }
  }
`;

export const QUERY_SHOPPING_LIST_BY_ID = /* GraphQL */ `
  query ShoppingListById($listId: Int!, $pageSize: Int!, $currentPage: Int!) {
    shoppingListById(list_id: $listId) {
      list_id
      list_name
      items_count
      items(pageSize: $pageSize, currentPage: $currentPage) {
        total_count
        items {
          item_id
          sku
          qty
          product {
            id
            sku
            name
            small_image { url }
            custom_attributes {
    attribute_metadata { code label }
    entered_attribute_value { value }
  }
            resolved_price {
              custom { value_incl_tax value_excl_tax currency }
              standard { value_incl_tax value_excl_tax currency }
            }
          }
        }
      }
    }
  }
`;

export const MUTATION_CREATE_SHOPPING_LIST = /* GraphQL */ `
  mutation CreateShoppingList($name: String!) {
    createShoppingList(name: $name) {
      list_id
      list_name
      items_count
    }
  }
`;

export const MUTATION_UPDATE_SHOPPING_LIST = /* GraphQL */ `
  mutation UpdateShoppingList($listId: Int!, $name: String!) {
    updateShoppingList(list_id: $listId, name: $name) {
      list_id
      list_name
      items_count
    }
  }
`;

export const MUTATION_DELETE_SHOPPING_LIST = /* GraphQL */ `
  mutation DeleteShoppingList($listId: Int!) {
    deleteShoppingList(list_id: $listId)
  }
`;

export const MUTATION_ADD_PRODUCT_TO_SHOPPING_LIST = /* GraphQL */ `
  mutation AddProductToShoppingList($listId: Int!, $sku: String!, $qty: Float!) {
    addProductToShoppingList(list_id: $listId, sku: $sku, qty: $qty) {
      list_id
      list_name
      items_count
    }
  }
`;

export const MUTATION_REMOVE_PRODUCT_FROM_SHOPPING_LIST = /* GraphQL */ `
  mutation RemoveProductFromShoppingList($itemId: Int!) {
    removeProductFromShoppingList(item_id: $itemId)
  }
`;

export const MUTATION_ADD_SHOPPING_LIST_TO_CART = /* GraphQL */ `
  mutation AddShoppingListToCart($listId: Int!) {
    addShoppingListToCart(list_id: $listId)
  }
`;

export const MUTATION_UPDATE_SHOPPING_LIST_ITEMS = /* GraphQL */ `
  mutation UpdateShoppingListItems($items: [ShoppingListItemUpdateInput!]!) {
    updateShoppingListItems(items: $items)
  }
`;

export const MUTATION_ADD_SELECTED_ITEMS_TO_CART = /* GraphQL */ `
  mutation AddSelectedItemsToCart($items: [ShoppingListItemUpdateInput!]!) {
    addSelectedItemsToCart(items: $items)
  }
`;

export const MUTATION_ADD_SINGLE_ITEM_TO_CART = /* GraphQL */ `
  mutation AddSingleItemToCart($itemId: Int!, $qty: Float!) {
    addSingleItemToCart(item_id: $itemId, qty: $qty)
  }
`;

export const QUERY_PROFILE = /* GraphQL */ `
  query Profile {
    customer {
      firstname
      lastname
      email
      date_of_birth
      gender

      addresses {
        id
        firstname
        lastname
        street
        city
        postcode
        country_code
        telephone

        region {
          region
          region_code
        }

        default_billing
        default_shipping
      }
    }
  }
`;


export const MUTATION_CREATE_ADDRESS = /* GraphQL */ `
  mutation CreateCustomerAddress($input: CustomerAddressInput!) {
    createCustomerAddress(input: $input) {
      id
    }
  }
`;

export const MUTATION_UPDATE_ADDRESS = /* GraphQL */ `
  mutation UpdateCustomerAddress($id: Int!, $input: CustomerAddressInput!) {
    updateCustomerAddress(id: $id, input: $input) {
      id
    }
  }
`;

export const MUTATION_DELETE_ADDRESS = /* GraphQL */ `
  mutation DeleteCustomerAddress($id: Int!) {
    deleteCustomerAddress(id: $id)
  }
`;
export const QUERY_DASHBOARD = /* GraphQL */ `
  query Dashboard {
    customer {
      firstname
      lastname
      email
    }
    customerCart {
      id
      total_quantity
    }
    customerOrders {
      total_count
      items {
        id
        increment_id
        order_date
        status
        shipping_method
        payment_methods {
          name
        }
        total {
          grand_total {
            value
            currency
          }
        }
      }
    }
  }
`;
export const QUERY_DASHBOARD_CUSTOMER = /* GraphQL */ `
  query DashboardCustomer {
    customer {
      firstname
      lastname
      email
    }
  }
`;

export const QUERY_DASHBOARD_CART = /* GraphQL */ `
  query DashboardCart {
    customerCart {
      id
      total_quantity
    }
  }
`;
export const QUERY_DASHBOARD_ORDERS = /* GraphQL */ `
  query DashboardOrders {
    customerOrders {
      items {
        id
        increment_id
        order_date
        status
        total {
          grand_total {
            value
            currency
          }
        }
      }
    }
  }
`;
export const QUERY_PRODUCTS_BY_SKUS = /* GraphQL */ `
  query ProductsBySkus($skus: [String!], $pageSize: Int!) {
    products(filter: { sku: { in: $skus } }, pageSize: $pageSize) {
      items {
        id
        sku
        name
        small_image { url }
        resolved_price {
          custom { value_incl_tax value_excl_tax currency }
          standard { value_incl_tax value_excl_tax currency }
        }
      }
    }
  }
`;