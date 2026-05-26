let CACHE_NAME = 'globalaco-v2';
let currentVersion = null;
let newVersionAvailable = false;

const urlsToCache = [
  '/manifest.json',
  '/version.json'
];

// Fetch version info
async function fetchVersion() {
  try {
    const response = await fetch('/version.json');
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error('Error fetching version:', error);
    return 'fallback-v1';
  }
}

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  
  event.waitUntil(
    fetchVersion().then((version) => {
      currentVersion = version;
      CACHE_NAME = `globalaco-${version}`;
      
      return caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Cache opened:', CACHE_NAME);
          return cache.addAll(urlsToCache);
        })
        .then(() => {
          console.log('Service Worker installed with version:', version);
        });
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Do NOT intercept cross-origin requests (Supabase, IBGE, Lovable, etc.).
  // Let the browser handle them natively to avoid breaking auth/POST bodies.
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Only handle GET same-origin requests; pass through everything else.
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-first for navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for same-origin static assets
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages
      return self.clients.claim();
    })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      payload: { version: currentVersion || CACHE_NAME }
    });
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Check for version updates
    fetchVersion().then((version) => {
      if (version !== currentVersion) {
        event.ports[0].postMessage({
          type: 'UPDATE_AVAILABLE',
          payload: { 
            updateAvailable: true,
            currentVersion: currentVersion,
            newVersion: version
          }
        });
      } else {
        event.ports[0].postMessage({
          type: 'NO_UPDATE',
          payload: { updateAvailable: false }
        });
      }
    });
  }
});