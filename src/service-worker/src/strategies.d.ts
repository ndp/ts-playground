import { FilesSpec } from "./files-specs.js";
export type CacheFileOnInstall = {
    strategy: 'cache-on-install';
    files: FilesSpec;
};
export declare function isCacheFileOnInstall(s: {
    strategy: string;
}): s is CacheFileOnInstall;
export type CachePathOnInstall = {
    strategy: 'cache-on-install';
    paths: string | Array<string>;
};
export declare function isCachePathOnInstall(s: {
    strategy: string;
}): s is CachePathOnInstall;
export type CacheFirstStrategy<Paths> = {
    readonly strategy: 'cacheFirst';
    readonly paths: Paths;
};
export type NetworkFirstStrategy<Paths> = {
    strategy: 'networkFirst';
    paths: Paths;
};
export type StaleWhileRevalidateStrategy<Paths> = {
    strategy: 'staleWhileRevalidate';
    paths: Paths;
};
export type NetworkOnlyStrategy<Paths> = {
    strategy: 'networkOnly';
    paths: Paths;
};
export type RoutableStrategy<Paths> = CacheFirstStrategy<Paths> | NetworkFirstStrategy<Paths> | StaleWhileRevalidateStrategy<Paths> | NetworkOnlyStrategy<Paths>;
export type CacheOnInstallStrategy = CachePathOnInstall | CacheFileOnInstall;
export type InputCacheStrategy = RoutableStrategy<InputPaths> | CacheOnInstallStrategy;
export type InputCacheStrategyAsPaths = RoutableStrategy<InputPaths> | CachePathOnInstall;
export declare const Origin: unique symbol;
export declare const Scope: unique symbol;
export type InputPaths = RegExp | string | OutputPaths | typeof Origin | typeof Scope;
export type OutputPaths = Array<string | RegExp>;
export declare function isRoutableStrategy<Paths>(x: {
    strategy: string;
}): x is RoutableStrategy<Paths>;
export declare function convertPreloadFilesToPaths(strategy: CacheFileOnInstall): CachePathOnInstall;
export declare function convertPreloadFilesToPreloadPaths(strategy: InputCacheStrategy): InputCacheStrategyAsPaths;
export declare function extractAllPreloadPaths(spec: Array<InputCacheStrategyAsPaths>): OutputPaths;
export declare function convertPreloadPathsToCacheFirst(spec: Array<InputCacheStrategyAsPaths>): Array<RoutableStrategy<InputPaths>>;
export declare function convertAllPreloadFilesToPreloadPaths(spec: Array<InputCacheStrategy>): Array<InputCacheStrategyAsPaths>;
