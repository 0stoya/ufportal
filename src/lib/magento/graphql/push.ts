// src/lib/magento/graphql/push.ts

export const QUERY_PORTAL_PUSH_ME = `#graphql
query PortalPushMe {
  portalPushMe {
    subscription_id
    endpoint
    p256dh
    auth
    content_encoding
    user_agent
    is_active
    updated_at
  }
}
`;


export const MUTATION_PORTAL_PUSH_SUBSCRIBE = `#graphql
mutation PortalPushSubscribe($input: PortalPushSubscribeInput!) {
  portalPushSubscribe(input: $input) {
    subscription_id
    endpoint
    is_active
    updated_at
  }
}
`;

export const MUTATION_PORTAL_PUSH_UNSUBSCRIBE = `#graphql
mutation PortalPushUnsubscribe($endpoint: String!) {
  portalPushUnsubscribe(endpoint: $endpoint)
}
`;
