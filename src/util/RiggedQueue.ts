
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
  private readonly nonWinners: Array<T>
  private winners: Set<T>
  private items: Array<T>|null = null
  private usages: Array<T> = []

  constructor(
    maxSize: number,
    winners: Iterable<T>,
    nonWinners: Array<T> = []) {
    this.maxSize = maxSize
    this.nonWinners = nonWinners
    this.winners = new Set(winners)
  }

  // Add some items at the front of the list, which will prioritize them over other non-winner items
  add(...moreItems: T[]) {
    for (let i = moreItems.length - 1; i >=0; --i)
      this.addOne(moreItems[i])
  }

  private addOne(item: T) {
    if (this.winners.has(item)) return; // Winners are already at the front of the list, so we don't need to add them again

    if (!this.nonWinners.includes(item))
      this.nonWinners.unshift(item)
    this.use(item)
    this.items = null
  }

  // Record usage of an item, which will prioritize it over other non-winner items
  use(item:T) {
    this.usages.unshift(item)
  }

  peek(): T[] {
    if (this.items === null)
      this.calculateItems()
    return this.items!
  }

  private calculateItems(): void {
    this.items = [...this.winners]
    for (const item of this.nonWinners) {
      if (this.items.length >= this.maxSize) break
      if (!this.items.includes(item))
        this.items.push(item)
    }
  }
}
