/**
 * Generic Tracker - tracks items, lets add listeners return cleanups, and runs those cleanups on removal.
 */
export type TrackerAddListener<T> = (item: T) => void | (() => void);
export declare class Tracker<T> {
    private readonly items;
    private readonly addListeners;
    private readonly cleanups;
    constructor(initial?: Iterable<T>);
    onAdd(fn: TrackerAddListener<T>): () => void;
    get size(): number;
    add(item: T): boolean;
    add(items: Iterable<T>): T[];
    remove(item: T): boolean;
    removeAll(): T[];
    /**
     * Replace current set with provided iterable. Removals (with cleanups) happen before additions.
     */
    setAll(items: Iterable<T>): {
        removed: T[];
        added: T[];
    };
    private notifyAdd;
    private recordCleanup;
    private _remove;
    private runCleanups;
}
export default Tracker;
