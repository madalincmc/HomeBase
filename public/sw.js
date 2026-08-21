/* HomeBase service worker — push delivery only (MAD-120).
 *
 * Deliberately does NOT cache anything. A dashboard whose entire value is
 * "what is due right now" must never serve stale data, so there is no fetch
 * handler here at all. This exists purely so the browser has something to
 * wake up when a push arrives while the app is closed.
 */

// Take over immediately rather than waiting for every tab to close, so an
// updated worker starts handling pushes on the next visit instead of some
// indeterminate time later.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed or non-JSON payload shouldn't swallow the notification —
    // iOS in particular requires that a push handler always displays
    // something, or it may revoke the push subscription.
    payload = {};
  }

  const title = payload.title || "HomeBase";
  const options = {
    body: payload.body || "You have household tasks due.",
    tag: payload.tag || "homebase-reminder",
    // Replace rather than stack: a later slot's reminder supersedes the
    // earlier one instead of leaving three near-identical notifications.
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Prefer focusing an already-open HomeBase window over spawning a
      // second one, then navigate it to the relevant page.
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
