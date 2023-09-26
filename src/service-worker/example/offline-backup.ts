import {generateServiceWorker} from "../generate";
import {Origin} from "../strategies";

const js = generateServiceWorker('1.0',
  [
    {strategy: "cache-on-install", paths: 'http://localhost:5000/' },
    {strategy: "networkFirst", paths: Origin}
  ], { skipWaiting: true, debug: true});

console.log(js)
