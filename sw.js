const CACHE_NAME = 'flowjob-v5';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/icons.js',
    '/signature.js',
    '/manifest.json',
    '/data/flat-rates.js',
    '/assets/icon.svg',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/icon-192-maskable.png',
    '/assets/icon-512-maskable.png',
    '/pages/dashboard.js',
    '/pages/quotes.js',
    '/pages/invoices.js',
    '/pages/scheduler.js',
    '/pages/customers.js',
    '/pages/tracker.js',
    '/pages/followups.js',
    '/pages/eod.js',
    '/pages/mileage.js',
    '/pages/inventory.js',
    '/pages/maintenance.js',
    '/pages/warranty.js',
    '/pages/discounts.js',
    '/pages/rates.js',
    '/pages/settings.js',
    '/pages/export.js',
    '/pages/storage.js',
    '/pages/quote-request.js',
    '/pages/customer-detail.js',
    '/modules/calendar-integration.js',
    '/modules/review-reputation.js',
    '/modules/email-marketing.js',
    '/modules/contract-legal.js',
    '/modules/employee-management.js',
    '/modules/insurance-claims.js',
    '/modules/membership-subscription.js',
    '/modules/price-book-manager.js',
    '/modules/data-dashboard.js',
    '/modules/plumbing-estimator.js',
    '/modules/job-site-reporter.js',
    '/modules/payment-settings.js',
    '/modules/warranty-tracker.js',
    '/modules/service-history.js'
];

// Install — precache all app shell + pages
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Fetch — stale-while-revalidate for JS/CSS, network-first for everything else
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Stale-while-revalidate for static assets (JS, CSS, images)
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cached => {
                    const fetchPromise = fetch(event.request).then(response => {
                        if (response && response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    }).catch(() => cached);

                    return cached || fetchPromise;
                });
            })
        );
        return;
    }

    // Network-first for HTML and everything else
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Activate — clean old caches and take control immediately
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Push notification
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/assets/icon.svg',
        badge: '/assets/icon.svg'
    };
    event.waitUntil(
        self.registration.showNotification('FlowJob', options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
