import { Happ } from '../Happ'

export function asString (happs: Happ[]): string {
  return happs.map(h => h.toString()).join('\n')
}

