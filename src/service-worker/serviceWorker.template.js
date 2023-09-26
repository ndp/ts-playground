// Files generated from serviceWorker.template.js

const ORIGIN_MATCHER = new RegExp(`^${regexEscape(self.origin)}.*`,"i")
const SCOPE_MATCHER = new RegExp(`^${regexEscape(self.registration.scope)}.*`,"i")

// VARIABLES

// Cache name is the major portion of the version.
// To start a new cache, increment the major version.
const CACHE_NAME = VERSION.split('.')[0];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRELOAD_PATHS)
                  .then(x => {
                    log(`Preloaded paths: ${PRELOAD_PATHS.length}`)
                    return x
                  })
        .then(() => SKIP_WAITING && self.skipWaiting())
    }),
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
          .then(cacheNames => Promise.all(
            cacheNames
              .filter(cacheName => cacheName !== CACHE_NAME)
              .map(cacheName => {
                log(`Clearing cache ${cacheName}` )
                return caches.delete(cacheName)
              }),
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


// Caching strategies

function staleWhileRevalidate (event) {
  return fromCache(event)
    .then(function (response) {
      var fetchPromise = fetchAndCache(event)
        .then(r => {
          logEvent(event, 'staleWhileRevalidate revalidated ', event)
          return r;
        })
      logEvent(event, `staleWhileRevalidate returning ${response ? '[stale]' : '[fresh]'}`)

      return response || fetchPromise
    })
}

function cacheFirst (event) {
  logEvent(event, 'cacheFirst')
  return fromCache(event)
    .then(response => response || fetchAndCache(event))
}

function networkFirst(event) {
  logEvent(event, 'networkFirst')
  return fetchAndCache(event)
    .then(response => response || fromCache(event))
    .catch(() => fromCache(event))
}

function networkOnly (event) {
  logEvent(event, 'networkOnly')
  return fetchRequest(event)
}


// Low-level helpers

function fetchRequest(event) {
  return fetch(event.request)
}

function fetchAndCache (event) {
  return fetchRequest(event)
    .then(response => toCache(event, response))
}

function fromCache (event) {
  return caches.open(CACHE_NAME).then(cache => cache.match(event.request))
}

function toCache (event, response) {
  if (!response.ok) {
    log(`request for ${event.request.url} failed with status ${response.statusText}`)
    return response
  }

  return caches.open(CACHE_NAME)
               .then(function (cache) {
                 cache.put(event.request, response.clone())
                 return response
               })
}

function logEvent(event, action) {
  log(`${action} for ` + event.request.url)
}
function log (s) {
  if (DEBUG)
    console.log('[SW] ' + s)
}
function regexEscape (s) {
  return s.replace(/([/.])/g, '\\$&')
}
