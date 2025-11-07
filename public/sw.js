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
  // Skip Service Worker for IBGE API completely
  if (event.request.url.includes('servicodados.ibge.gov.br')) {
    console.log('SW: Skipping IBGE API request entirely');
    return; // Don't intercept at all
  }
  
  // Network-first strategy for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // For other cross-origin requests, use network-only strategy
  if (!event.request.url.startsWith(self.location.origin)) {
    console.log('SW: Cross-origin request, using network-only');
    event.respondWith(
      fetch(event.request).catch(error => {
        console.error('SW: Network request failed:', error);
        throw error;
      })
    );
    return;
  }

  // Cache-first strategy for same-origin requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
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