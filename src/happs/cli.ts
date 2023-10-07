import * as fs from 'fs'
import { GeologicEraIngester } from './ingesting/GeologicEraIngester'
import { Happ } from './Happ'
import { sort } from './util'
import { asString } from './viz/asString'
import { asTextBarChart } from './viz/asTextBarChart'


// references
// tags
// parent
// importance / value or priority

function overlap (a: Happ, b: Happ): boolean {
  return false
}


function filter (by: 'within' | 'intersecting', ...haps: Happ[]): Happ[] {
  return haps
}

new Happ({ from: 4_500, to: 2_500, scale: 'Mya', name: 'Archean', description: '“Ancient” eon' })
new Happ({ from: 2_500, to: 540, scale: 'Mya', name: 'Proterozoic', description: '“Early life” eon' })
new Happ({ from: 540, to: 248, scale: 'Mya', name: 'Paleozoic', description: '“Ancient life” eon' })
new Happ({ from: 248, to: 65, scale: 'Mya', name: 'Mesozoic', description: '“Middle life” eon' })
const a = new Happ({ from: 208, to: 146, scale: 'Mya', name: 'Jurassic', description: 'dinosaurs rule the land' })
console.log(a)

interface Processor {
  score: (s: string) => number // how well does this match? 0 < i < 1
  process: (s: string) => Happ[]
}


const geos = fs.readFileSync(__dirname + '/data/geological-eras.txt').toString()

const p = new GeologicEraIngester()
console.log({ score: p.score(geos) })

const geoTimeline = p.process(geos)
console.log('unprocessable', p.unprocessable(geos))


console.log(asString(sort('begin', geoTimeline)))
console.log(asTextBarChart(sort('begin', geoTimeline)))


