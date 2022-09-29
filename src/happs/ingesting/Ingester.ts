import { Happ } from '../Happ'

export interface Ingester {
  score (s: string): number

  process (lines: string): Happ[]

  unprocessable (lines: string, options: { ignoreBlankLines: boolean }): Array<{ text: string; 'line': number }>
}
