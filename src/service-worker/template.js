const DEBUG = true
const PRELOAD_PATHS = ['${PRELOAD_PATHS}']
const CACHE_NAME = ['${CACHE_NAME}']
const ROUTES =
  [
    [networkOnly, []],
    [staleWhileRevalidate, []],
    [cacheFirst, []],
  ]

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRELOAD_PATHS)
    }),
  )
})


self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
          .then(cacheNames => Promise.all(
            cacheNames
              .filter(cacheName => cacheName !== CACHE_NAME)
              .map(cacheName => caches.delete(cacheName)),
          )),
  )
})


self.addEventListener('fetch', function (event) {

  const url = event.request.url

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!url.startsWith('http')) return

  // Find the first route that matches and emit the response.
  ROUTES.reduce(
    (done, [fn, paths]) => done || respondIfMatch(fn, paths), false)

  function respondIfMatch (fn, paths) {
    if (matches(paths)) {
      event.respondWith(fn(event))
      return true
    } else
      return false
  }

  function matches (paths) {
    return paths &&
           paths.some(path => path instanceof RegExp ?
                              path.exec(url) : url.endsWith(path))
  }
})


function fetchAndCache (event) {
  log('fetchAndCache ', event.request.url)
  return networkOnly(event)
    .then(response => toCache(event, response))
}

function staleWhileRevalidate (event) {
  log('staleWhileRevalidate ', event.request.url)
  return fromCache(event)
    .then(function (response) {
      var fetchPromise = fetchAndCache(event)
      return response || fetchPromise
    })
}

function cacheFirst (event) {
  log('cacheFirst ', event.request.url)
  return fromCache(event)
    .then(response => response || fetchAndCache(event))
}

function fromCache (event) {
  return caches.open(CACHE_NAME).then(cache => cache.match(event.request))
}

function toCache (event, response) {
  if (!response.ok) {
    log('request for ' + event.request.url +
        ' failed with status ' + response.statusText)
    return response
  }

  log('caching ', event.request.url)
  return caches.open(CACHE_NAME)
               .then(function (cache) {
                 cache.put(event.request, response.clone())
                 return response
               })
}

function networkFirst(event) {
  return networkOnly(event)
    .then(response => response || fetchAndCache(event))
}

function networkOnly (event) {
  return fetch(event.request)
}

function log (s) {
  if (DEBUG)
    console.log('[Service Worker]: ' + s)
}
