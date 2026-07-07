const CACHE = 'aft-v82';
const FILES = ['index.html','style.css','script.js','idb-contacts-notes.js','contacts-tab.js','notes-tab.js','interpret-tab.js','customers-tab.js','research-tab.js','review-tab.js','manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
