/* Yalıkent — service worker
   Bu dosyanın varlığı önemli: eksik olduğunda Chrome manifest alanlarını
   (özellikle "orientation") yok sayıp eski usul kısayol kuruyor. */
const CACHE = "yalikent-2026-09-11-G";

/* Kurulumda önbelleğe alınacaklar. three.js ve yazı tipleri başka kaynaktan
   geldiği için opak yanıt döner; yine de saklanabilir. */
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./model-galerisi.html",
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

/* Sayfa istekleri (HTML) için önce ağ, sonra önbellek.
   Eski hâli her istekte önbelleği öne alıyordu; bu yüzden GitHub'a yüklenen
   yeni sürüm ilk açılışta görünmüyor, kullanıcı "değişmedi" sanıyordu.
   Statik varlıklar (ikon, yazı tipi, three.js) hâlâ önce önbellekten gelir. */
const sayfaMi = req =>
  req.mode === "navigate" ||
  (req.headers.get("accept") || "").includes("text/html");

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (sayfaMi(req)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const kopya = res.clone();
          caches.open(CACHE).then(c => c.put(req, kopya)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then(hit => hit || caches.match("./index.html"))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        fetch(req).then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const kopya = res.clone();
            caches.open(CACHE).then(c => c.put(req, kopya)).catch(() => {});
          }
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const kopya = res.clone();
          caches.open(CACHE).then(c => c.put(req, kopya)).catch(() => {});
        }
        return res;
      }).catch(() => Response.error());
    })
  );
});

/* sayfa "yeni sürüm var" derse hemen devral */
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
