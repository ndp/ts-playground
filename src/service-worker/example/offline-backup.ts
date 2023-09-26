import {generateServiceWorker} from "../generate";

const js = generateServiceWorker('1.0',
  [
    {strategy: "cache-on-install", paths: 'http://localhost:5000/' },
    {strategy: "networkFirst", paths: /http:\/\/localhost.*/}
  ], { skipWaiting: true, debug: true});

console.log(js)
