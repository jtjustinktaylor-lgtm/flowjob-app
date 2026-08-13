const CACHE = 'flowjob-v4';
const ASSETS = [
  './', './index.html', './style.css', './app.js',
  './icons.js', './signature.js', './data/flat-rates.js',
  './pages/dashboard.js', './pages/quotes.js', './pages/invoices.js',
  './pages/scheduler.js', './pages/rates.js', './pages/customers.js',
  './pages/tracker.js', './pages/maintenance.js', './pages/discounts.js',
  './pages/quote-request.js', './pages/eod.js', './pages/followups.js',
  './pages/warranty.js', './pages/settings.js',
  './pages/customer-detail.js', './pages/mileage.js',
  './pages/inventory.js', './pages/export.js', './pages/storage.js',
  './modules/calendar-integration.js', './modules/review-reputation.js',
  './modules/email-marketing.js', './modules/contract-legal.js',
  './modules/employee-management.js', './modules/insurance-claims.js',
  './modules/membership-subscription.js', './modules/price-book-manager.js',
  './modules/data-dashboard.js',
  './manifest.json'
];

// Pre-cache on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
        // Cache what we can individually
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url).catch(() => console.warn('Failed:', url)))
        );
      });
    })
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve cache fast, update in background
self.addEventListener('fetch', e => {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(CACHE).then(cache => {
      return cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(networkResponse => {
          // Only cache valid same-origin responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Network failed — return cached or fallback to index.html for navigation
          if (e.request.mode === 'navigate') {
            return cache.match('./index.html');
          }
          return cached;
        });

        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise;
      });
    })
  );
});
