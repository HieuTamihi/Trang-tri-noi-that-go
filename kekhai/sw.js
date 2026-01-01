const CACHE_NAME = 'kekhai-v1';
const urlsToCache = [
    '/kekhai/',
    '/kekhai/index.html',
    '/kekhai/styles.css',
    '/kekhai/app.js',
    '/kekhai/config.js',
    '/kekhai/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Cài đặt Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Đã mở cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Xử lý request
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Nếu có trong cache thì trả về
                if (response) {
                    return response;
                }
                // Không có thì fetch từ network
                return fetch(event.request);
            })
    );
});

// Cập nhật cache khi có version mới
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
