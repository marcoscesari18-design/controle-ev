// ---------------------------------------------------------------
// Service Worker — deixa o Controle EV 100% offline.
// Estratégia: cache primeiro (o app inteiro é salvo no aparelho
// na primeira visita; depois disso funciona sem internet).
// ---------------------------------------------------------------
const CACHE = 'controle-ev-v9';
const ARQUIVOS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './js/jspdf.umd.min.js',
  './js/jspdf.plugin.autotable.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache:'reload' ignora o cache HTTP do navegador — garante que cada
  // versão nova instala com os arquivos REALMENTE atuais do servidor
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Remove caches de versões antigas
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Chamadas externas (ex.: API do GitHub para o backup) vão direto à rede
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (res) => res || fetch(e.request).then((r) => {
        // Guarda no cache qualquer arquivo novo do próprio app
        if (r.ok && new URL(e.request.url).origin === location.origin) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return r;
      })
    ).catch(() => caches.match('./index.html'))
  );
});
