
export function fill (n: number, ch: string) {
  return Array(Math.round(n)).fill(ch).join('')
}


/**
 * The infamous "left pad".
 * @param s
 * @param len
 */
export const lpad = (s: string, len: number): string => s.length < len ? lpad(' ' + s, len) : s;



export const rpad = (s: string, len: number): string => s.length < len ? rpad(s.toString() + ' ', len) : s;

