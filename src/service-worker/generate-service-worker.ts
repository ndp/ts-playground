import {generateServiceWorker} from "./generate";

const js = generateServiceWorker('1.0.4', [
  {
    strategy: "cache-on-install",
    paths: [
      '/Impact-Label-fontfacekit/Impact_label_reversed.css',
      '/Impact-Label-fontfacekit/Impact_label_reversed-webfont.woff'
    ]
  },
  {
    strategy: "cacheFirst",
    paths: [
      '/favicon.ico',
      '/symbola.css?wednesday',
      '/open-search-description.xml',
      /\/main\..*/   // main css and js
    ]
  },
  {
    strategy: "staleWhileRevalidate",
    paths: /\/data\/out\/.*\.json/
  }
], true);
// const js = generateServiceWorker('1.1', [
//   {strategy: "cache-on-install", paths: '/foo.jpeg'},
//   {strategy: "cache-on-install", files: {glob: '*.md'}},
//   {strategy: "cache-on-install", files: {dir: '/Users/ndp/workspace/ts-playground/src/happs', glob: '**/*.ts'}},
//   {strategy: "staleWhileRevalidate", paths: /.*\.json/}
// ]);

console.log(js)

