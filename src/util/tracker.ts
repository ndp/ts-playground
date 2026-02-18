/**
 * Generic Tracker - tracks a set of items and notifies listeners on add/remove.
 */
export type TrackerListener<T> = (item: T) => void

export default class Tracker<T> {
  private items: Set<T>
  private addListeners: Set<TrackerListener<T>> = new Set()
  private removeListeners: Set<TrackerListener<T>> = new Set()

  constructor(initial?: Iterable<T>) {
    this.items = new Set(initial)
  }

  // Subscribe to adds; returns an unsubscribe function
  onAdd(fn: TrackerListener<T>): () => void {
    this.addListeners.add(fn)
    return () => { this.addListeners.delete(fn) }
  }

  // Subscribe to removes; returns an unsubscribe function
  onRemove(fn: TrackerListener<T>): () => void {
    this.removeListeners.add(fn)
    return () => { this.removeListeners.delete(fn) }
  }


  get size(): number {
    return this.items.size
  }

  // Add a single item or many items. Overloads below provide typings.
  add(item: T): boolean
  add(items: Iterable<T>): T[]
  add(itemOrItems: T | Iterable<T>): boolean | T[] {
    const isIter = itemOrItems != null && typeof (itemOrItems as any)[Symbol.iterator] === 'function'
    // Treat strings as single items (strings are iterable but usually represent T itself)
    if (!isIter || typeof itemOrItems === 'string') {
      const item = itemOrItems as T
      if (this.items.has(item)) return false
      this.items.add(item)
      this.notifyAdd(item)
      return true
    }

    const items = itemOrItems as Iterable<T>
    const added: T[] = []
    for (const it of Array.from(items)) {
      if (!this.items.has(it)) {
        this.items.add(it)
        added.push(it)
      }
    }
    for (const it of added) this.notifyAdd(it)
    return added
  }

  remove(item: T): boolean {
    if (!this.items.has(item)) return false
    this.items.delete(item)
    this.notifyRemove(item)
    return true
  }

  removeAll(): T[] {
    const removed = Array.from(this.items)
    for (const it of removed) this.notifyRemove(it)
    this.items.clear()
    return removed
  }

  /**
   * Replace current set with provided iterable. Notifications: removes first, then adds.
   * Returns an object with arrays of removed and added items.
   */
  setAll(items: Iterable<T>): { removed: T[]; added: T[] } {
    const newSet = new Set(items)
    const removed: T[] = []
    const added: T[] = []

    for (const it of Array.from(this.items)) {
      if (!newSet.has(it)) removed.push(it)
    }

    for (const it of Array.from(newSet)) {
      if (!this.items.has(it)) added.push(it)
    }

    // Apply removals then additions
    for (const it of removed) {
      this.items.delete(it)
      this.notifyRemove(it)
    }

    for (const it of added) {
      this.items.add(it)
      this.notifyAdd(it)
    }

    return { removed, added }
  }

  private clearListeners(): void {
    this.addListeners.clear()
    this.removeListeners.clear()
  }

  private dispose(): void {
    this.clearListeners()
    this.items.clear()
  }

  private notifyAdd(item: T) {
    for (const fn of Array.from(this.addListeners)) {
      try { fn(item) } catch (e) { /* swallow listener errors */ }
    }
  }

  private notifyRemove(item: T) {
    for (const fn of Array.from(this.removeListeners)) {
      try { fn(item) } catch (e) { /* swallow listener errors */ }
    }
  }
}
