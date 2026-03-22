// src/lib/magento/queries.shopping-list.ts

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
  query ShoppingListById($listId: Int!, $currentPage: Int = 1) {
    shoppingListById(list_id: $listId) {
      list_id
      list_name
      items_count
      items(pageSize: 50, currentPage: $currentPage) {
        total_count
        items {
          item_id
          qty
          sku
          product {
            __typename
            name
            sku
            small_image {
              url
            }
            price_range {
              minimum_price {
                regular_price {
                  value
                  currency
                }
              }
            }
            # If you use Amasty or custom pricing, you might check for resolved_price here too
            # resolved_price { ... } 
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
    }
  }
`;

export const MUTATION_UPDATE_SHOPPING_LIST = /* GraphQL */ `
  mutation UpdateShoppingList($listId: Int!, $name: String!) {
    updateShoppingList(list_id: $listId, name: $name) {
      list_id
      list_name
    }
  }
`;

export const MUTATION_DELETE_SHOPPING_LIST = /* GraphQL */ `
  mutation DeleteShoppingList($listId: Int!) {
    deleteShoppingList(list_id: $listId)
  }
`;

export const MUTATION_ADD_PRODUCT_TO_LIST = /* GraphQL */ `
  mutation AddProductToShoppingList($listId: Int!, $sku: String!, $qty: Float!) {
    addProductToShoppingList(list_id: $listId, sku: $sku, qty: $qty) {
      list_id
      items_count
    }
  }
`;

export const MUTATION_REMOVE_ITEM_FROM_LIST = /* GraphQL */ `
  mutation RemoveProductFromShoppingList($itemId: Int!) {
    removeProductFromShoppingList(item_id: $itemId)
  }
`;

export const MUTATION_ADD_LIST_TO_CART = /* GraphQL */ `
  mutation AddShoppingListToCart($listId: Int!) {
    addShoppingListToCart(list_id: $listId)
  }
`;

export const MUTATION_ADD_SELECTED_ITEMS_TO_CART = /* GraphQL */ `
  mutation AddSelectedItemsToCart($items: [ShoppingListItemUpdateInput!]!) {
    addSelectedItemsToCart(items: $items)
  }
`;