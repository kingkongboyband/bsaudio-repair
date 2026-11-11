/* Service worker: ให้หน้าแอพเปิดได้เร็วและเปิดได้แม้เน็ตหลุด (ข้อมูลงานซ่อมยังต้องใช้เน็ตตามเดิม) */
const CACHE = "bsaudio-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;                                   // POST ไป Apps Script ผ่านตรง ไม่แคช
  if (url.hostname === "script.google.com" || url.hostname.endsWith("googleusercontent.com")) return;

  if (req.mode === "navigate") {                                      // หน้าเว็บ: ลองเน็ตก่อน ถ้าไม่ได้ใช้ของที่แคชไว้
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(                                                      // ไฟล์อื่น/ฟอนต์: ใช้แคชก่อน แล้วอัพเดทเบื้องหลัง
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === "opaque")) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
