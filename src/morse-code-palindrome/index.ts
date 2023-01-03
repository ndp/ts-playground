import {wordSet} from "./dict";
import {Alpha, asMorseCode, isMorseableChar} from "./morse";
import {Alpha2AphlaMap} from "./morse-palindrome";


export function reflectionOf(s: string, keepSpaces = true) {
  const e = [] as Array<Alpha>

  for (const ch of s.split('')) {
    if (isMorseableChar(ch))
      e.unshift(Alpha2AphlaMap[ch as Alpha])
    else if (ch == ' ')
      keepSpaces && e.unshift(' ' as Alpha)
    else return null
  }

  return e.join('')
}


// is the word given a palindrome in morse code?
function isMorsindrome(word: string) {
  const letters = word.split('')
  for (let i = 0; i < (word.length / 2); i++) {
    const endLetter = letters.at(-i - 1) as Alpha;
    if (!isMorseableChar(letters[i])
      || letters[i] !== Alpha2AphlaMap[endLetter])
      return false
  }
  return true
}

const bannedWords = new Set(`
aer
ana
ao
ar
ea
ean
eft
es
fe
fi
ge
ges
ing
na
nae
ni
obe
og
oto
pia
po
rea
reb
repp
se
ser
sie
sier
te
toi
wro
`.split('\n'))

for (const w of [...wordSet]) {

  if (w.length < 2) continue

  const ref = reflectionOf(w)

  if (isMorsindrome(w)) {
    console.log('M: ' + w + `            ${asMorseCode(w)}`)
  } else if (ref && wordSet.has(ref))
    console.log(`2: ${w}|${ref}      ${asMorseCode(w)} | ${asMorseCode(ref)}`)
  else if (ref && w.length > 3) {
    for (let i = 1; i < ref.length; i++) {
      const front = ref.slice(0, i)
      const back = ref.slice(i)
      if (wordSet.has(front)
        && wordSet.has(back)
        && !bannedWords.has(front)
        && !bannedWords.has(back))
        console.log(` : ${w}|${front} ${back}   ${asMorseCode(w)} | ${asMorseCode(front)}     ${asMorseCode(back)}`)
    }
    // console.log('P: ' + w)
    // console.log(reflect(w))
  }

}


// outdoer|re outdo
// re outdo sans outdoer
// outdoer waits sting re-outdo
/// re-outdo a gnu
// Spots sans Tops
// re-outdo spot tops outdoer
// own re-outdo spot tops outdoer ago
// dawn|a gnu
// keep | peek
// Re-outdo Andy Quan, outdoer!
