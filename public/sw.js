// Service Worker for offline functionality and caching
const CACHE_NAME = 'transcript-analytics-v1'
const STATIC_CACHE_NAME = 'transcript-analytics-static-v1'
const DYNAMIC_CACHE_NAME = 'transcript-analytics-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/analytics',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
]

// API routes to cache with different strategies
const API_ROUTES = {
  CACHE_FIRST: [
    '/api/transcripts',
    '/api/analytics/trends'
  ],
  NETWORK_FIRST: [
    '/api/analytics/predictions',
    '/api/sheets/sync'
  ],
  STALE_WHILE_REVALIDATE: [
    '/api/transcripts/',
  ]
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request))
    return
  }

  // Handle page requests
  event.respondWith(handlePageRequest(request))
})

// Cache-first strategy for static assets
async function handleStaticAssets(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('Error handling static assets:', error)
    return new Response('Asset not available offline', { status: 503 })
  }
}

// Different strategies for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Cache-first for stable data
  if (API_ROUTES.CACHE_FIRST.some(route => pathname.startsWith(route))) {
    return cacheFirst(request)
  }

  // Network-first for dynamic data
  if (API_ROUTES.NETWORK_FIRST.some(route => pathname.startsWith(route))) {
    return networkFirst(request)
  }

  // Stale-while-revalidate for frequently updated data
  if (API_ROUTES.STALE_WHILE_REVALIDATE.some(route => pathname.startsWith(route))) {
    return staleWhileRevalidate(request)
  }

  // Default to network-first
  return networkFirst(request)
}

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone())
        }
      }).catch(() => {})
      
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    return createOfflineResponse('Data not available offline')
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    return createOfflineResponse('Network unavailable')
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  // Always try to fetch from network
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => null)
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Otherwise wait for network
  const networkResponse = await networkPromise
  return networkResponse || createOfflineResponse('Data temporarily unavailable')
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    return caches.match('/offline') || createOfflineResponse('Page not available offline')
  }
}

// Create offline response
function createOfflineResponse(message) {
  return new Response(
    JSON.stringify({ 
      error: message,
      offline: true,
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  )
}

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-transcripts') {
    event.waitUntil(syncTranscriptData())
  }
})

// Sync transcript data when online
async function syncTranscriptData() {
  try {
    // Get pending updates from IndexedDB or localStorage
    const pendingUpdates = await getPendingUpdates()
    
    for (const update of pendingUpdates) {
      await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      })
    }
    
    // Clear pending updates
    await clearPendingUpdates()
    
    console.log('Background sync completed')
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Placeholder functions for pending updates management
async function getPendingUpdates() {
  // Implementation would use IndexedDB or localStorage
  return []
}

async function clearPendingUpdates() {
  // Implementation would clear IndexedDB or localStorage
}