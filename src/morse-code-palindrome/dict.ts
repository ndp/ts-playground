import fs from "fs";

const words =
  fs.readFileSync('/usr/share/dict/words').toString()
    .split('\n')
    .map(s => s.toLowerCase())
    .filter(s => !s.includes('c'))
    .filter(s => !s.includes('j'))
    .filter(s => !s.includes('z'))
    .filter(s =>
      s.length > 1
      || (s == 'a' || s == 'i'))

export const wordSet = new Set(words)

// console.log(new Set(words.filter(w => w.length <= 2)))
