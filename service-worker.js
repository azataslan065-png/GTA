/* Yalıkent — service worker
   Bu dosyanın varlığı önemli: eksik olduğunda Chrome manifest alanlarını
   (özellikle "orientation") yok sayıp eski usul kısayol kuruyor. */
const CACHE = "yalikent-2026-09-10-B";

/* Kurulumda önbelleğe alınacaklar. three.js ve yazı tipleri başka kaynaktan
   geldiği için opak yanıt döner; yine de saklanabilir. */
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./yalikent-icon-192.png",
  "./yalikent-icon-512.png",
  "./yalikent-icon-maskable.png",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      /* tek tek ekle: biri düşerse tüm kurulum çökmesin */
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        /* arka planda tazele, oyuncu beklemesin */
        fetch(req).then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        req.mode === "navigate" ? caches.match("./index.html") : Response.error()
      );
    })
  );
});

/* sayfa "yeni sürüm var" derse hemen devral */
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
