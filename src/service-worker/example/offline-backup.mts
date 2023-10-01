import {generateServiceWorker} from "../src/generate.mjs";
import {Origin} from "../src/strategies.mjs";

const js = generateServiceWorker(
  [
    {strategy: "cache-on-install", paths: 'http://localhost:5000/'},
    {strategy: "networkFirst", paths: Origin}
  ], {version: '1.0', skipWaiting: true, debug: true});

console.log(js)
