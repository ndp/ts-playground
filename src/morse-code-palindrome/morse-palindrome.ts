import {Alpha, Alpha2MorseMap, isMorse, Morse, Morse2AlphaMap} from "./morse";

export const Alpha2AphlaMap = {} as Record<Alpha, Alpha>
for (const ch in Alpha2MorseMap) {
  const morse: Morse = Alpha2MorseMap[ch as Alpha];
  const reversedMorse = morse.split('').reverse().join('')
  if (isMorse(reversedMorse)) {
    const reverseAlpha: Alpha = Morse2AlphaMap[reversedMorse];
    Alpha2AphlaMap[reverseAlpha] = ch as Alpha
    Alpha2AphlaMap[ch as Alpha] = reverseAlpha
  } else {
    console.log(`no reverse for ${ch}`)
  }
}
