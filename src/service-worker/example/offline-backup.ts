import {generateServiceWorker} from "../src/generate.js";
import {Origin} from "../src/strategies.js";

const js = generateServiceWorker(
  [
    {strategy: "cache-on-install", paths: 'http://localhost:5000/'},
    {strategy: "networkFirst", paths: Origin}
  ], {version: '1.0', skipWaiting: true, debug: true});

console.log(js)
