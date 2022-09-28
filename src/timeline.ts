import * as fs from 'fs'
import { GeologicEraProcessor } from './GeologicEraProcessor'
import { Happ } from './Happ'
import { sort } from './happs/util'
import { asString } from './happs/viz/asString'
import { asTextBarChart } from './happs/viz/asTextBarChart'


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

new Happ({ from: 4_500, to: 2_500, unit: 'Mya' }, { name: 'Archean', nickname: '“Ancient” eon' })
new Happ({ from: 2_500, to: 540, unit: 'Mya' }, { name: 'Proterozoic', nickname: '“Early life” eon' })
new Happ({ from: 540, to: 248, unit: 'Mya' }, { name: 'Paleozoic', nickname: '“Ancient life” eon' })
new Happ({ from: 248, to: 65, unit: 'Mya' }, { name: 'Mesozoic', nickname: '“Middle life” eon' })
const a = new Happ({ from: 208, to: 146, unit: 'Mya' }, { name: 'Jurassic', nickname: 'dinosaurs rule the land' })
console.log(a)

interface Processor {
  score: (s: string) => number // how well does this match? 0 < i < 1
  process: (s: string) => Happ[]
}


const geos = fs.readFileSync(__dirname + '/geological-eras.txt').toString()

const p = new GeologicEraProcessor()
console.log({ score: p.score(geos) })

const geoTimeline = p.process(geos)
console.log('unprocessable', p.unprocessable(geos))


console.log(asString(sort('begin', geoTimeline)))
console.log(asTextBarChart(sort('begin', geoTimeline)))


