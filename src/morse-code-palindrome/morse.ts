export const Alpha2MorseMap = {
  a: ". _",
  b: "_ . . .",
  //c: "_ . _ .",
  d: "_ . .",
  e: ".",
  f: ". . _ .",
  g: "_ _ .",
  h: ". . . .",
  i: ". .",
  //j: ". _ _ _",
  k: "_ . _",
  l: ". _ . .",
  m: "_ _",
  n: "_ .",
  o: "_ _ _",
  p: ". _ _ .",
  q: "_ _ . _",
  r: ". _ .",
  s: ". . .",
  t: "_",
  u: ". . _",
  v: ". . . _",
  w: ". _ _",
  x: "_ . . _",
  y: "_ . _ _",
  //z: "_ _ . .",
  '0': "_ _ _ _ _",
  '1': ". _ _ _ _",
  '2': ". . _ _ _",
  '3': ". . . _ _",
  '4': ". . . . _",
  '5': ". . . . .",
  '6': "_ . . . .",
  '7': "_ _ . . .",
  '8': "_ _ _ . .",
  '9': "_ _ _ _ ."
} as const

export type Alpha = keyof typeof Alpha2MorseMap
export type Morse = typeof Alpha2MorseMap[Alpha]

export const Morse2AlphaMap: Record<Morse, Alpha> =
  (Object.keys(Alpha2MorseMap) as Array<Alpha>)
    .reduce<Record<Morse, Alpha>>((h, k: Alpha) => {
        const morse = Alpha2MorseMap[k];
        h[morse] = k
        return h
      },
      {} as Record<Morse, Alpha>)


// console.log({Morse2Alpha, Alpha2Morse, inverse})
export function isMorse(s: string): s is Morse {
  return !!Morse2AlphaMap[s as Morse]
}


export function isMorseableChar(s: string): s is Alpha {
  return !!Alpha2MorseMap[s as Alpha]
}

export function asMorseCode(s: string) {
  return s
    .split('')
    .map(ch => {
      if (isMorseableChar(ch))
        return Alpha2MorseMap[ch]
      else
        return ` [${ch}] `
    })
    .join('   ')
}

