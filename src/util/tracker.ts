import {isIterableNonString} from './typescript.ts'

/**
 * Generic Tracker - tracks items, lets add listeners return cleanups, and runs those cleanups on removal.
 */
export type TrackerCleanup<T> = () => void | Promise<void>
export type TrackerAddListener<T> = (item: T) => void | (() => void) | Promise<void | (() => void)>

export class Tracker<T> {
  private readonly items: Set<T>
  private readonly addListeners: Set<TrackerAddListener<T>> = new Set()
  private readonly cleanups: Map<T, Set<TrackerCleanup<T>>> = new Map()
  private pendingAsyncResults: Promise<unknown>[] = []

  constructor(initial?: Iterable<T>) {
    this.items = new Set(initial || [])
  }

  // Subscribe to adds; returns an unsubscribe function
  onAdd(fn: TrackerAddListener<T>): () => void {
    this.addListeners.add(fn)
    return () => { this.addListeners.delete(fn) }
  }

  get size(): number {
    return this.items.size
  }

  // Add a single item or many items. Overloads below provide typings.
  add(item: T): boolean
  add(items: Iterable<T>): T[]
  add(itemOrItems: T | Iterable<T>): boolean | T[] {
    if (!isIterableNonString(itemOrItems)) {
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
    this._remove(item)
    return true
  }

  removeAll(): T[] {
    const removed = Array.from(this.items)
    for (const item of removed) {
      this._remove(item)
    }
    this.items.clear()
    return removed
  }

  /**
   * Replace current set with provided iterable. Removals (with cleanups) happen before additions.
   */
  setAll(items: Iterable<T>): { removed: T[]; added: T[] } {
    const next = new Set(items)
    const removed: T[] = []
    const added: T[] = []

    for (const it of Array.from(this.items)) {
      if (!next.has(it)) removed.push(it)
    }

    for (const it of Array.from(next)) {
      if (!this.items.has(it)) added.push(it)
    }

    for (const item of removed) {
      this._remove(item)
    }

    for (const it of added) {
      this.items.add(it)
      this.notifyAdd(it)
    }

    return { removed, added }
  }

  async flushPendingAsyncResults(): Promise<unknown[]> {
    const pending = this.pendingAsyncResults
    this.pendingAsyncResults = []

    const settled = await Promise.allSettled(pending)
    return settled.flatMap((result) => result.status === 'rejected' ? [result.reason] : [])
  }

  private notifyAdd(item: T) {
    for (const fn of Array.from(this.addListeners)) {
      try {
        const result = fn(item)
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          this.pendingAsyncResults.push(
            Promise.resolve(result)
              .then((cleanup) => {
                if (typeof cleanup === 'function')
                  this.recordCleanup(item, cleanup as TrackerCleanup<T>)
              })
              .catch((error) => {
                console.error('[Tracker] add listener failed', error)
                throw error
              })
          )
          continue
        }

        if (typeof result === 'function')
          this.recordCleanup(item, result as TrackerCleanup<T>)
      } catch (error) {
        console.error('[Tracker] add listener failed', error)
        this.pendingAsyncResults.push(Promise.reject(error))
      }
    }
  }

  track(item: T, cleanup: TrackerCleanup<T>) {
    this.recordCleanup(item, cleanup)
  }

  private recordCleanup(item: T, cleanup: TrackerCleanup<T>) {
    const set = this.cleanups.get(item) ?? new Set<TrackerCleanup<T>>()
    set.add(cleanup)
    this.cleanups.set(item, set)
  }

  private _remove(item: T) {
    this.runCleanups(item)
    this.cleanups.delete(item)
    this.items.delete(item)
  }

  private runCleanups(item: T) {
    const cleanups = this.cleanups.get(item)
    if (!cleanups) return
    for (const fn of Array.from(cleanups)) {
      try {
        const result = fn()
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          Promise.resolve(result).catch((error) => {
            console.error('[Tracker] cleanup failed', error)
          })
        }
      } catch (error) {
        console.error('[Tracker] cleanup failed', error)
      }
    }
  }
}

export default Tracker
