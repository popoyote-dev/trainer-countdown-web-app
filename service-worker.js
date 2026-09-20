const CACHE_NAME = 'trainer-countdown-v1';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './static/css/styles.css',
    './static/app/main.js',
    './static/app/audio.js',
    './static/app/cycleManager.js',
    './static/app/storage.js',
    './static/app/timer.js',
    './static/vendor/qrious.min.js',
    './static/vendor/jsQR.js',
    './static/img/circle-cancel-svgrepo-com.svg',
    './static/img/copy-svgrepo-com.svg',
    './static/img/cross-svgrepo-com.svg',
    './static/img/dumbell-svgrepo-com.svg',
    './static/img/edit-svgrepo-com.svg',
    './static/img/forward-svgrepo-com.svg',
    './static/img/hamburger-4-svgrepo-com.svg',
    './static/img/hexagon-plus-svgrepo-com.svg',
    './static/img/logout-svgrepo-com.svg',
    './static/img/next-svgrepo-com.svg',
    './static/img/pause-svgrepo-com.svg',
    './static/img/play-2-svgrepo-com.svg',
    './static/img/qr-reader-svgrepo-com.svg',
    './static/img/reload-svgrepo-com.svg',
    './static/img/share-svgrepo-com.svg',
    './static/img/stopwatch-svgrepo-com.svg',
    './static/img/tick-svgrepo-com.svg',
    './static/img/toggle-off-svgrepo-com.svg',
    './static/img/toggle-on-svgrepo-com.svg',
    './static/img/trash-2-svgrepo-com.svg',
    './static/sounds/1-bell.mp3',
    './static/sounds/2-bells.mp3',
    './static/sounds/3-bells.mp3',
    './static/sounds/alarm-beep.mp3',
    './static/sounds/alarm-clock-beep.mp3',
    './static/sounds/beep-alarm.mp3',
    './static/sounds/countdown-beep.mp3',
    './static/sounds/start-sound-beep.mp3',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((cacheName) => cacheName !== CACHE_NAME)
                .map((cacheName) => caches.delete(cacheName)),
        )),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                const responseCopy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
                return networkResponse;
            });
        }),
    );
});