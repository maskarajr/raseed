// Minimal service worker to make the Booker PWA installable.
// Online-only app: we intentionally do NOT cache API responses (offline sync
// is a non-goal). We only provide a basic app-shell fetch passthrough so the
// install criteria (a fetch handler + manifest + icons over HTTPS) are met.

const CACHE = "raseed-shell-v2";
const SHELL = [
  "/booker",
  "/login",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/brand/raseed-app-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Never cache API calls — always hit the network (online-only tool).
  if (new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }
  // Network-first with cache fallback for navigations/shell assets.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((r) => r || fetch(request))),
  );
});
