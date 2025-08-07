
const cacheName = 'musicsync-cache';
const filestoCache = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    "./icon.png",
    "./assets/index.css",
    "./assets/index.js",
    "./assets/AbstractID3Parser.js",
    "./assets/AiffParser.js",
    "./assets/core.js",
    "./assets/DsdiffParser.js",
    "./assets/DsfParser.js",
    "./assets/FlacParser.js",
    "./assets/MatroskaParser.js",
    "./assets/MP4Parser.js",
    "./assets/MpegParser.js",
    "./assets/MusepackParser.js",
    "./assets/OggParser.js",
    "./assets/WaveParser.js",
    "./assets/WavPackParser.js",
];
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(filestoCache))
    );
});
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', async (event) => {
    const req = event.request;
    if (req.url.indexOf("update") !== -1 || req.url.indexOf("gstatic.com") !== -1 && navigator.userAgent.indexOf("Firefox") !== -1) event.respondWith(await fetch(req)); else event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
    try {
        const networkResponse = await fetch(req);
        const cache = await caches.open("musicsync-cache");
        await cache.delete(req);
        await cache.put(req, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(req);
        return cachedResponse;
    }
}