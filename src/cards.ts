// remove "declare global" if you are writing your code in global scope to begin with
// declare global {
// interface Array<T> {
//   includes<U extends (T extends U ? unknown : never)> (
//     searchElement: U, fromIndex?: number): boolean;
// }

// }


const ranksStr = '23456789XJQKA'
const ranks = ranksStr.split('') as Array<Rank>

type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '⑩' | 'J' | 'Q' | 'K' | 'A'


const SuitMap = {
  'S': ['♠️', '♠'],
  'H': ['♥️', '♥'],
  '♦️': ['D', '♦'],
  '♣️': ['C', '♣']
}

const SuitArray = Object.keys(SuitMap) as Array<keyof typeof SuitMap>

type SuitType = keyof typeof SuitMap

class Card {
  rank: Rank
  suit: SuitType

  constructor (s: CardStr) {
    this.rank = RankOf(s)
    this.suit = SuitOf(s)
  }

  toString() { return `${this.rank} of ${this.suit}`}

}

const asSuit = (s: string): SuitType | undefined =>
  SuitArray
    .find(
      (suit) =>
        (s === suit) || SuitMap[suit].includes(s))

type CardStr = `${Rank}${SuitType}`

type HandOf2Str = `${CardStr}${CardStr}`

type HandOf5 = [Card, Card, Card, Card, Card]
type HandOf7 = [Card, Card, Card, Card, Card, Card, Card]
type Hand = HandOf5 | HandOf7

const splitCardStr = (c: CardStr) => (
  [c.substring(0, 1),
    c.substring(1)]) as [Rank, SuitType]

const RankOf = (c: CardStr) => splitCardStr(c)[0]
const SuitOf = (c: CardStr) => splitCardStr(c)[1]

function HighCard (hand: Hand): Card {
  let bestCard: Card = hand[0]
  hand.forEach(card => {
    if (bestCard
      && ranks.indexOf(bestCard.rank) > ranks.indexOf(card.rank))
      return
    bestCard = card
  })
  return bestCard
}

console.log(SuitOf('5♦️'))
console.log(RankOf('5♦️'))
;
([
  [new Card('5♦️'), new Card('5♦️'), new Card('5♦️'), new Card('5♦️'), new Card('5♦️')],
  [new Card('2♦️'), new Card('J♦️'), new Card('8♦️'), new Card('8♦️'), new Card('9♦️')],
  [new Card('A♦️'), new Card('K♦️'), new Card('Q♦️'), new Card('5♦️'), new Card('2♦️')]
] as HandOf5[]).forEach(hand => {
  console.log('HighCard: ', HighCard(hand), hand)
})
