/* 拍照記錄 離線快取（service worker）｜GROK 輔助・作者：帥｜版本 2026-11-25-1324
   - 只管自己的快取（名稱開頭 photonotes-shell-），清舊版時也只刪這種名稱；
     絕對不碰 mealcam-mirror-v1、mealcam-pending-v1 等照片資料快取，也不碰 IndexedDB／localStorage
   - 畫面（HTML）：先連網拿最新版，連不上（或 5 秒沒回應）才用快取 → 不會卡在舊版
   - 圖示、manifest：先用快取
   - 地圖圖片（OpenStreetMap）等外部網址：不經過、不快取 */
const PREFIX = 'photonotes-shell-', CACHE = PREFIX + '2026-11-25-1324';
/* 觀察項 O3：快取的 key 一律去掉 ?v= 之類的查詢參數，同一頁只存一份 */
const bare = u => { const x = new URL(u, self.location.href); x.search = ''; x.hash = ''; return x.href; };
const SHELL = ['./', './index.html', './GROK-photo-notes.webmanifest', './GROK-photo-notes-icon-180.png', './GROK-photo-notes-icon-192.png', './GROK-photo-notes-icon-512.png', './favicon.ico'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.includes('/__mirror__/')) return;
  if (!u.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (r.mode === 'navigate') { e.respondWith(netFirst(r)); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(bare(r.url)).then(m => m || fetch(r).then(res => {
    if (res.ok && res.type === 'basic') c.put(bare(r.url), res.clone());
    return res;
  }))));
});
async function netFirst(r) {
  const c = await caches.open(CACHE);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(r.url, { signal: ctl.signal, credentials: 'same-origin', cache: 'no-cache' });
    clearTimeout(t);
    if (res.ok) await c.put(bare(r.url), res.clone());
    return res;
  } catch (err) {
    return (await c.match(bare(r.url))) || (await c.match(bare('./'))) || Response.error();
  }
}
