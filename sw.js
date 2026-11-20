/* Guin Home Studio — service worker (ทำให้ติดตั้งเป็นแอป + เปิดครั้งถัดไปเร็วขึ้น)
   - หน้าเว็บ (index.html): เปิดจากที่เก็บในเครื่องทันที แล้วโหลดตัวใหม่เก็บไว้เบื้องหลัง
     · ถ้าเป็นการรีเฟรชจากแถบ "มีเว็บเวอร์ชันใหม่" (URL มี ?v=) → โหลดจากเน็ตก่อนเสมอ
   - version.json / Firebase / API ภายนอก: ไม่แตะ (ไปเน็ตตรง ๆ)
   - ไฟล์ scene/*.js?v=… และรูป: เก็บไว้ในเครื่อง (เลข ?v= เปลี่ยน = ได้ไฟล์ใหม่) */
const CACHE = 'guin-app-v2';
// เก็บหน้าเว็บแยกตามที่อยู่หน้า (ไม่รวม ?v=) · / กับ /index.html = หน้าเดียวกัน
const pageKey = u => u.origin + u.pathname.replace(/index\.html$/, '');

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('guin-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                 // Firebase / Google / CDN → ปล่อยผ่าน
  if (/version\.json$/.test(url.pathname)) return;             // เช็กเวอร์ชันต้องสดเสมอ

  // หน้าเว็บ
  if (req.mode === 'navigate') {
    const fresh = url.searchParams.has('v');
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const key = pageKey(url);
      const net = fetch(req, { cache: 'no-store' }).then(r => { if (r && r.ok) cache.put(key, r.clone()); return r; });
      if (fresh) { try { return await net; } catch (_) { return (await cache.match(key)) || Response.error(); } }
      const hit = await cache.match(key);
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      try { return await net; } catch (_) { return Response.error(); }
    })());
    return;
  }

  // ไฟล์ประกอบในเว็บเดียวกัน (scene/*.js?v=, รูปไอคอน, manifest)
  if (/\.(js|css|png|jpe?g|webp|svg|json|woff2?)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      const keep = url.searchParams.has('v') || /\.(png|jpe?g|webp|svg|woff2?)$/i.test(url.pathname);
      if (r && r.ok && keep) {
        // ลบรุ่นเก่าของไฟล์เดียวกัน (?v= เดิม) ไม่ให้ที่เก็บในเครื่องบวมขึ้นเรื่อย ๆ
        const old = (await cache.keys()).filter(k => { const u = new URL(k.url); return u.pathname === url.pathname && u.search !== url.search; });
        await Promise.all(old.map(k => cache.delete(k)));
        cache.put(req, r.clone());
      }
      return r;
    })());
  }
});
