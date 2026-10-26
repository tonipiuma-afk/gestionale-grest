// ═══════════════════════════════════════════════════════
//  GESTIONALE — Service Worker (ottobre 2026: notifiche)
//  File: sw.js — accanto a index.html su GitHub Pages
// ═══════════════════════════════════════════════════════

const CACHE = 'grest-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  // Cache-first per librerie CDN
  if (e.request.url.includes('cdnjs') || e.request.url.includes('jsdelivr')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(resp => {
            cache.put(e.request, resp.clone());
            return resp;
          })
        )
      )
    );
  }
});

// ── Notifica in arrivo dal server ──
// Il server manda: { titolo, corpo, tag, vai, app: 'scu' | 'grest' }
// (si accettano anche i vecchi campi tipo/url)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {
    try { d = { corpo: e.data ? e.data.text() : '' }; } catch (e2) {}
  }
  const scu = d.app === 'scu';
  const titolo = d.titolo || (scu ? 'Servizio Civile' : 'Gestionale');
  const opzioni = {
    body: d.corpo || '',
    icon: scu ? './scu-icon-192.png' : './icon-192.png',
    badge: scu ? './scu-icon-192.png' : './icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [120, 60, 120],
    timestamp: d.il || Date.now(),
    data: { vai: d.vai || '', app: scu ? 'scu' : 'grest', url: d.url || '' }
  };
  // ogni notifica arrivata va mostrata (iPhone lo richiede)
  e.waitUntil(self.registration.showNotification(titolo, opzioni));
});

// ── Tocco sulla notifica: apre l'app sulla pagina giusta ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const dati = e.notification.data || {};
  const base = new URL('./', self.registration.scope).href;
  const url = dati.url || (base + (dati.app === 'scu' ? '?app=scu' : '') + (dati.vai ? (dati.app === 'scu' ? '&' : '?') + 'vai=' + encodeURIComponent(dati.vai) : ''));
  e.waitUntil((async () => {
    const lista = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of lista) {
      if (c.url && c.url.indexOf(base) === 0 && 'focus' in c) {
        try { c.postMessage({ tipo: 'notifica-vai', vai: dati.vai || '' }); } catch (err) {}
        return c.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
