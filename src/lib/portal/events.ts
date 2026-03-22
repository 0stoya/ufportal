export const PORTAL_EVENTS = {
  cartChanged: "portal:cart-changed",
} as const;

export function emitCartChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PORTAL_EVENTS.cartChanged));
}
