import { Happ } from '../Happ'
import { fill } from '../../util/string'
import { range, sort } from '../util'

export function asTextBarChart (happs: Happ[]): string {
  happs = sort('begin', happs)
  const r = range(happs)
  const w = 100
  const scaleX = (mya: number) => Math.round(w - (w / (r.from - r.to) * mya))
  return happs.map(h => {
    const from = scaleX(h.duration.from)
    const to = scaleX(h.duration.to)
    const len = to - from
    const name = h.description.name
    const durStr = `${h.duration.from} – ${h.duration.to} ${h.duration.unit}`
    if ((len - 2) > name.length) {
      return `${fill(from, ' ')}|${fill((to - from - name.length) / 2, '=')}${name}${fill((to - from - name.length) / 2, '=')}|${fill(w - to, ' ')} ${durStr}`
    } else if (from > (name.length + 2))
      return `${fill(from - name.length - 1, ' ')}${name} |${fill(to - from, '=')}|${fill(w - to, ' ')} ${durStr}`
    else
      return `${fill(from, ' ')}|${fill(to - from, '=')}| ${name}${fill(w - to - 1 - name.length, ' ')} ${durStr}`
  }).join('\n')
}
