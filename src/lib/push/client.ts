// Browser-side push helpers. No server imports — safe for Client Components.

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, reason: "Not in a browser." };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "Service workers aren't available." };
  if (!("PushManager" in window)) return { supported: false, reason: "Push isn't available." };
  if (!("Notification" in window)) {
    // The usual cause on iOS: opened in a normal Safari tab rather than from
    // the Home Screen, where Apple doesn't expose the Notification API.
    return { supported: false, reason: "Add HomeBase to your Home Screen to enable reminders." };
  }
  return { supported: true };
}

// applicationServerKey must be raw bytes; the VAPID public key is base64url.
// Backed by an explicit ArrayBuffer so the result is Uint8Array<ArrayBuffer>
// rather than Uint8Array<ArrayBufferLike> — BufferSource won't accept the
// latter, since it could in principle be a SharedArrayBuffer.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await registerServiceWorker();
  // Wait for activation — subscribing against an installing worker throws.
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    // Required by every browser: we must always show a visible notification
    // for each push, which this app does anyway.
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function serializeSubscription(subscription: PushSubscription): SerializedSubscription | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}
