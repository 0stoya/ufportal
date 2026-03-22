declare module "web-push" {
  type VapidDetails = {
    subject: string;
    publicKey: string;
    privateKey: string;
  };

  type PushSubscription = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  type SendOptions = {
    TTL?: number;
    vapidDetails?: VapidDetails;
    headers?: Record<string, string>;
    contentEncoding?: "aesgcm" | "aes128gcm";
  };

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: SendOptions
  ): Promise<unknown>;

  const webpush: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };

  export default webpush;
}
