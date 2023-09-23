import {generateServiceWorker} from "./generate";

const js = generateServiceWorker('1.1', [
  {strategy: "cache-on-install", paths: '/foo.jpeg'},
  {strategy: "cache-on-install", files: {glob: '*.md'}},
  {strategy: "cache-on-install", files: {dir: '/Users/ndp/workspace/ts-playground/src/happs', glob: '**/*.ts'}},
  {strategy: "staleWhileRevalidate", paths: /.*\.json/}
]);

console.log(js)

