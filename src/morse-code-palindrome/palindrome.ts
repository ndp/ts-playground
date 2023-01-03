import {Alpha} from "./morse";

export function isPalindrome(word: string) {
  const letters = word.split('')
  for (let i = 0; i < (word.length / 2); i++) {
    const endLetter = letters.at(-i - 1) as Alpha;
    if (letters[i] !== endLetter)
      return false
  }
  return true
}
