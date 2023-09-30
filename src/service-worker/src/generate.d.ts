import { InputCacheStrategy, InputPaths } from './strategies.js';
export type Plan = Array<InputCacheStrategy>;
type Version = string;
export type Options = {
    version?: Version;
    debug?: boolean;
    skipWaiting?: boolean;
};
export declare function generateServiceWorker(inputSpec: Plan, optionsIn?: Options): string;
export declare function generateVersion(version: Version): string;
export declare function generateFlag(name: string, bool: boolean): string;
export declare function pathsToJS(paths: InputPaths): string;
export declare function pathToJS(path: string | RegExp | symbol): string;
export {};
