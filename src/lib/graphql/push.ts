export const MUTATION_PUSH_SUBSCRIBE = `#graphql
mutation PortalPushSubscribe($input: PortalPushSubscribeInput!) {
  portalPushSubscribe(input: $input) {
    subscription_id
    endpoint
    is_active
    updated_at
  }
}
`;

export const MUTATION_PUSH_UNSUBSCRIBE = `#graphql
mutation PortalPushUnsubscribe($endpoint: String!) {
  portalPushUnsubscribe(endpoint: $endpoint)
}
`;

export const QUERY_PUSH_ME = `#graphql
query PortalPushMe {
  portalPushMe {
    subscription_id
    endpoint
    is_active
    updated_at
  }
}
`;
