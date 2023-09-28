

## Why

Service workers are a powerful tool for developers to improve the user experience, providing for fine-grained caching and offline usage. It replaced the coarse-grained _AppCache_ that proved quite hard to use effectively. Unfortunately, the service worker API is too fine-grained: it requires always nested promise chains and grows complicated quickly. Most examples describe a single specific strategy you might use. These are readable, but real-world examples require integrating several of these strategies at the same time. This can be error-prone and hard to follow. It can also be tricky to test. To make it work, service workers run in a specific environment, and often require their own or parallel build configuration.

There are a [other libraries](#other-libraries) designed to help, but they often solve only one narrow use cases. This library is ambitious. It:

- provides a declarative API to _describe_ your webapp caching
- is fully typed in Typescript
- provides easy integration of multiple caching strategies
- built-in debugging
- clear versioning rules of cache

## Example

The very simplest service worker might provide an offline backup of the whole site:
```ts
import {Plan} from "../generate";

export const plan: Plan = [
  {paths: Origin, strategy: "networkFirst"}
]
```
This plan says, "intercept all the requests from the origin and below (usually everything under `/`), and serve if from the network if available, otherwise, serve from the cache." This is a crude way to provide offline access to your app, and parallels one of the multiple-line building blocks. 

But it lacks several key components:
- only caches paths that have been visited
- provides no way to update cached files

To cache files that may not be visited, you will need to precache them by name:

```ts
import type {Plan} from "../generate";

export const plan: Plan = 
  [
    {paths: ['/about.html', '/help.html'], strategy: 'cache-on-install'},
    {paths: Origin, strategy: "networkFirst"}
  ]
```

## Usage

There are a few ways to use this:

### CLI

1. Create a `service-worker.ts` file that exports a `plan` variable
2. Run `> ts-sw service-worker.ts`
3. Serve the resultant file as your service worker, editing the Typescript file and regenerating as needed.

### Within Express

```ts
app.get('/service-worker.js', (req: IncomingMessage,
                               res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Cache-Control', 'max-age=0')
  res.end(renderServiceWorker([
    { strategy: 'networkFirst', paths: Origin }
  ]))
})
```
### Other
There are other ways to incorporate this into your build cycle. Let me know how you do it! One thing you see repeatedly-- and one of the challenges of service workers-- is that the packager settings for a service worker are different than what would be used for the rest of the app. There are lots of "work-arounds" for this. 

Note that the output of this tool needs no post-processing, so it's best to avoid these tools for the service worker if possible. If the code output isn't compatible, let me know and I'll fix it right away.

## Options

The following may be provided as options, and they effect the generation of the Javascript code:

* version – semantic version of the worker. Major version bump means to reset the cache.
* skipWaiting – executes the normal skip waiting logic, and allows your service worker to come into play without all the browser windows being closed.
* debug – outputs log messages as files are fetched. This is too noise for production, but may be useful to figure out what is going on with your service worker.

## Paths

Paths can be:
- a string URL path. This is intepreted as the meaning the URL must END with this pattern
- a RegExp, matching the full URL
- an array of strings or RegExp
- the symbol `Symbol.for('origin')`, which matches everything under the service worker's domain.
- the symbol `Symbol.for('scope')`, which matches everything under the service worker's scope, which is the level that a service worker is installed at.

## Strategies

### cache-on-install

Tell it paths to cache when the service worker activates.

Also, it can scan directories from resources. This is optional, but for some use cases you will have a whole directory of files you want to pre-cache. Use normal glob patterns to identify these as shown below. 
```ts
plan: Plan = [
  {
    files: {
      glob: '**/*.png',
      dir: 'src/images',
      prefix: '/assets'
    },
    strategy: 'cache on install'
  }
]
```
The globs are evaluated with the `service-worker.js` file is created, so updating resources will require rebuilding the file.

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

The browsers will manage the cache, removing items if it becomes too larger.

Most of the strategies will replace older assets with newer ones when found.

If you _need_ to reset the cache, simply increment the version number. A major version bump means the whole cache is replaced. See [#versioning] below.

## Versioning

Service workers themselves have no concept of versioning. The browser manages downloading the service worker on page load, and if it's "out of date", it will notice. It will install the new service worker and then wait until the current one isn't in use, and replace it with the new one. This generally means a new service worker won't come into play until the user closes the windows, so it may be some time. To accelerate this, pass `skipWaiting` in the options, which will activate the service worker as soon as it is downloaded.

Service workers themselves don't have the concept of semantic versioning, but this library provides a simple one: you can provide a VERSION string. The first component of it (the major version number), will be used to name the cache. If this changes, the cache is deleting and a new one created. This is the only effective way of resetting the cache from the service worker. (To test locally, you will use the browser's developer tools.) 



Strategies:
precache
cache
prefetching (on installation)
offline responses
network-first
cache-first
offline backup  

TODO

Command line

filter/only to process only certain types, eg. only: /https?:.*/

allowOnly: /
https://web.dev/learn/pwa/workbox/#offline-fallback
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#recovering_failed_requests
https://github.com/veiss-com/sw-tools#limiting-the-cache-size
offline SVG: https://github.com/veiss-com/sw-tools#offline

expiring cache


REFERENCE
https://web.dev/learn/pwa/serving/
https://web.dev/offline-cookbook/#on-network-response


## Other Libraries
- https://web.dev/learn/pwa/workbox/ -- popular and very cool tool. This will work for many projects, but I was looking for something where I had a little more control.
- https://vite-pwa-org.netlify.app/frameworks/sveltekit.html
- https://github.com/veiss-com/sw-tools#offline -- very specific features
- https://github.com/TalAter/UpUp/ -- single use case: provides a "backup" of your site if it's offline


// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
