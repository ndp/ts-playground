export type RiggedQueueChangeEvent<T> = {
  added: T[]
  removed: T[]
  items: T[]
}

export type RiggedQueueChangeListener<T> = (event: RiggedQueueChangeEvent<T>) => void

/*
  A special form of priority queue that allows:
  - user can add items to the front of the list
  - there is a hard cap, and when that cap is exceeded, the least
    recently used items are dropped off the end of the list
  - rigging of certain "winner" items. These always sit at the
    front of the list and never drop off the list.
  - keep track of usage. If an item is used, but goes the front
    of the queue to not be dropped off the list (but does NOT move in
    the list)
 */
export class RiggedQueue<T> {
  private readonly maxSize: number
  private winners: Set<T>
  private items: Array<T> = []
  private usages: Array<T> = []
  private readonly listeners: Set<RiggedQueueChangeListener<T>> = new Set()
  private dirty: boolean = true

  constructor(
    maxSize: number,
    winners: Iterable<T>,
    nonWinners: Iterable<T> = []) {
    this.maxSize = maxSize
    this.winners = new Set(winners)
    this.items = [...winners, ...[...nonWinners].filter(item => !this.winners.has(item))]
  }

  // Register a listener that fires after each add() batch when peek() actually changes.
  // Returns an unsubscribe function.
  onChange(listener: RiggedQueueChangeListener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Add some items at the front of the list, which will prioritize them over other non-winner items
  add(...moreItems: T[]) {
    const before = this.peek().slice()
    for (let i = moreItems.length - 1; i >= 0; --i)
      this.addOne(moreItems[i])
    this.notifyChange(before)
  }

  addWinners(...winners: T[]) {
    const before = this.peek().slice()
    winners.forEach(winner => this.winners.add(winner))
    winners
      .filter(winner => !this.items.includes(winner))
      .forEach(winner => this.addAfterWinners(winner))
    this.dirty = true
    this.notifyChange(before)
  }

  removeWinners(...winners: T[]) {
    winners.forEach(winner => {
      this.winners.delete(winner)
      this.addOne(winner) // add the removed winner back as a non-winner, which will prioritize it over other non-winners but not over existing winners
    })
  }

  private addOne(item: T) {
    if (this.winners.has(item)) return; // Winners are already at the front of the list, so we don't need to add them again

    this.use(item)
    if (this.items.includes(item)) return

    this.dirty = true

    this.addAfterWinners(item)
  }

  private addAfterWinners(item: T) {
    for (let i = Math.max(0, this.winners.size - 1); i < this.items.length; ++i)
      if (!this.winners.has(this.items[i])) {
        this.items.splice(i, 0, item)
        return
      }
    this.items.unshift(item)
  }

  // Record usage of an item, which will prioritize it over other non-winner items
  use(item: T) {
    this.usages.unshift(item)
  }

  peek(): T[] {
    if (this.dirty)
      this.calculateItems()
    return this.items!
  }

  private calculateItems(): void {
    console.log(`calculateItems: ${this.items.join(',')} ${this.maxSize}`)
    // if (this.winners.size >= this.maxSize)

    const numberOfItemsToRemove = Math.max(0, this.items.length - Math.max(this.maxSize, this.winners.size))

    console.log(`numberOfItemsToRemove`, numberOfItemsToRemove)
    if (numberOfItemsToRemove == 0) return


    const removing = this.items
      .filter(item => !this.winners.has(item))
      .sort((a, b) => {
        const aUsageIndex = this.usages.indexOf(a)
        const bUsageIndex = this.usages.indexOf(b)

        if (aUsageIndex === -1 && bUsageIndex !== -1) return 1
        if (aUsageIndex !== -1 && bUsageIndex === -1) return -1
        if (aUsageIndex >= 0 && bUsageIndex >= 0)
          return aUsageIndex - bUsageIndex

        const aIndex = this.items.indexOf(a)
        const bIndex = this.items.indexOf(b)
        return aIndex - bIndex
      })
      .reverse()
      .slice(0, numberOfItemsToRemove)

    console.log(' -> removing ' + removing.join('|'))
    for (let i of removing)
      this.items.splice(this.items.indexOf(i), 1)

    this.dirty = false

    return
  }

  private notifyChange(before: T[]): void {
    if (this.listeners.size === 0) return
    const after = this.peek()
    const beforeSet = new Set(before)
    const afterSet = new Set(after)
    const added = after.filter(x => !beforeSet.has(x))
    const removed = before.filter(x => !afterSet.has(x))
    if (added.length === 0 && removed.length === 0) return
    const event: RiggedQueueChangeEvent<T> = {added, removed, items: after}
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event)
      } catch { /* swallow listener errors */
      }
    }
  }
}
