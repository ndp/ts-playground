

## Why

Service workers are a powerful tool for developers to improve the user experience, providing for fine-grained caching and offline usage. Unfortunately, the API is complicated to use. Most examples describe specific strategies, but real-world examples require integrating several different strategies at the same time. This can be tricky to write and test.

There are a [other libraries](#other-libraries) designed to help, but they often solve only one narrow use case. This library is:

- provides a declarative API to specify your webapp caching
- Typescript type safety (even though service workers may not be written in Typescript)
- high level, easy integration of various caching strategies
- built-in debugging
- clear versioning rules of cache

## Example usages

The very simplest service worker might provide an offline backup of the whole site:
```ts
import {generateServiceWorker} from "../generate";

const sw = generateServiceWorker('1.0',
  [
    {strategy: "networkFirst", paths: /http:\/\/localhost.*/}
  ]);
```
The `sw` variable will provide full Javascript that will process network requests normally, but cache the results and serve them if the site is offline. This is a very naive approach and not recommended, and is similar to what some tools provide out of the box.

## Strategies

### cache-on-install


### cacheFirst

Ideal for: CSS, images, fonts, JS, templates… basically anything you'd consider static to that "version" of your site.
>> Using this strategy, the service worker looks for the matching request in the cache and returns the corresponding Response if it's cached. Otherwise it retrieves the response from the network (~~optionally,~~ updating the cache for future calls). If there is neither a cache response nor a network response, the request will error. Since serving assets without going to the network tends to be faster, this strategy prioritizes performance over freshness.

There is no way to remove files from the cache. For this reason, use only for immutable resources (certain images and fingerprinted assets). If these do need to be updated, you will need to [rebuild the cache (see below)](#Rebuild Cache).

See [https://web.dev/learn/pwa/serving/#cache-first].


### networkFirst

This is most useful to provide the user with a backup in case the network isn't available.

> This strategy is the mirror of the Cache First strategy; it checks if the request can be fulfilled from the network and, if it can't, tries to retrieve it from the cache. If there is neither a network response nor a cache response, the request will error. Getting the response from the network is usually slower than getting it from the cache, this strategy prioritizes updated content instead of performance.

See [https://web.dev/learn/pwa/serving/#network-first].

### staleWhileRevalidate

This is useful for resources that could be slow to fetch but where freshness is not critical.

> The stale while revalidate strategy returns a cached response immediately, then checks the network for an update, replacing the cached response if one is found. This strategy always makes a network request, because even if a cached resource is found, it will try to update what was in the cache with what was received from the network, to use the updated version in the next request. This strategy, therefore, provides a way for you to benefit from the quick serving of the cache first strategy and update the cache in the background.

> With this strategy, the assets are updated in the background. This means your users won't get the new version of the assets until the next time that path is requested. At that time the strategy will again check if a new version exists and the cycle repeats.

See https://web.dev/learn/pwa/serving/#stale-while-revalidate

### networkOnly

> The network only strategy is similar to how browsers behave without a service worker or the Cache Storage API. Requests will only return a resource if it can be fetched from the network. This is often useful for resources like online-only API requests.
> 
See https://web.dev/learn/pwa/serving/#network-only


## Rebuild Cache

## Versioning

Service workers themselves have no concept of versioning. The browser manages downloading the service worker on page load, and if it's "out of date", it will notice. It will install the new service worker and then wait until the current one isn't in use, and replace it with the new one. This generally means a new service worker won't come into play until the user closes the windows, so it may be some time. To accelerate this, pass `skipWaiting` in the options, which will activate the service worker as soon as it is downloaded.


all paths are relative to the service worker. And the service worker can only provide access at it's path level or below, so it's likely you'll be serving your service worker from the top level.

auto versioning

Strategies:
precache
cache
prefetching (on installation)
offline responses
network-first
cache-first
offline backup  

spec (JSON)
  type, globs
  pick up file paths OR
  pick up wildcards at run-time

config => Javascript file

Serve
  spec => endpoint

TODO
on install, skip waiting
allowOnly: /
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#recovering_failed_requests
https://web.dev/learn/pwa/workbox/#offline-fallback
https://github.com/veiss-com/sw-tools#limiting-the-cache-size
offline SVG: https://github.com/veiss-com/sw-tools#offline

origin/scope references for path matching

filter/only to process only certain types, eg. only: /https?:.*/

REFERENCE
https://web.dev/learn/pwa/serving/
https://web.dev/offline-cookbook/#on-network-response


## Other Libraries
https://web.dev/learn/pwa/workbox/ -- popular
https://vite-pwa-org.netlify.app/frameworks/sveltekit.html
https://github.com/veiss-com/sw-tools#offline -- very specific features
https://github.com/TalAter/UpUp/ -- minimal config


// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
