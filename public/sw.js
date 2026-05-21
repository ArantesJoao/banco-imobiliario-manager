// Basic service worker — registers for PWA install. No offline caching of
// dynamic data (game state lives in Postgres). Static assets get cached by
// the browser's HTTP cache and Next's own static asset headers.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op — let the network handle requests.
});
