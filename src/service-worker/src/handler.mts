import {IncomingMessage, ServerResponse} from "http";
import {generateServiceWorker, Options, Plan} from "./generate.mjs";


export const handler = ((plan: Plan, options: Options) => {

  const renderedServiceWorker = generateServiceWorker(
    plan,
    options
  )
  return (req: IncomingMessage,
          res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/javascript')
    res.setHeader('Cache-Control', 'max-age=0')
    res.end(renderedServiceWorker)
  };
})
