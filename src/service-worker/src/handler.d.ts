import { IncomingMessage, ServerResponse } from "http";
import { Options, Plan } from "./generate.js";
export declare const handler: (plan: Plan, options: Options) => (req: IncomingMessage, res: ServerResponse) => void;
