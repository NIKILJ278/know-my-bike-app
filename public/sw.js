// Caches OpenStreetMap tile images as they're viewed, so an area of the
// map the rider has already opened keeps rendering with no signal at
// all. Deliberately scoped to ONLY map tile images — the app's own data
// (bikes, logs, documents) is not cached here, since caching live data
// incorrectly is far worse than not caching it (a rider silently seeing
// stale fuel logs or an out-of-date member list is a real hazard). That
// would need a proper offline-first sync layer, which this is not.
const TILE_CACHE = 'know-my-bike-tiles-v1'
const isTileRequest = (url) => /tile\.openstreetmap\.org\//.test(url)

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !isTileRequest(request.url)) return

  event.respondWith(
    caches.open(TILE_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response && response.ok) cache.put(request, response.clone())
        return response
      } catch (err) {
        // Offline and this tile was never viewed before — nothing to
        // serve. Let it fail; Leaflet just shows a blank tile there.
        throw err
      }
    })
  )
})
