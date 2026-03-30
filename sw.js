// ═══════════════════════════════════════════════════════
//  GESTIONALE GREST 2026 — Service Worker
//  File: sw.js
//  Da caricare su GitHub Pages nella stessa cartella di index.html
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

// ── Gestione Push in arrivo ──
self.addEventListener('push', e => {
  let data = {
    titolo: 'Gestionale GREST',
    corpo: 'Hai una nuova notifica',
    tipo: 'generale',
    url: '/'
  };
  try {
    if (e.data) data = Object.assign(data, e.data.json());
  } catch(err) {}

  const emoji = {
    messaggio: '💬',
    sondaggio: '📋',
    pagamento: '💰',
    presenza:  '📅',
    iscrizione:'🏕️'
  };

  const opzioni = {
    body: (emoji[data.tipo] ? emoji[data.tipo] + ' ' : '') + data.corpo,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tipo || 'grest',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  e.waitUntil(
    self.registration.showNotification(data.titolo, opzioni)
  );
});

// ── Click sulla notifica: apre/porta in primo piano l'app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) {
        if (c.url && c.focus) { c.focus(); return; }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
