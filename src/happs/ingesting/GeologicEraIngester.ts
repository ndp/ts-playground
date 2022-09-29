import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'node:path'
import { GeologicDuration, Happ } from '../Happ'
import { Ingester } from './Ingester'


export class GeologicEraIngester implements Ingester {

  score (s: string): number {
    return this.process(s).length / s.split('\n').length
  }

  process (lines: string): Happ[] {
    return lines.split('\n')
                .map(s => this.processOne(s))
                .map(m => {
                  // console.log({ m });
                  return m
                })
                .filter(h => h !== null) as Happ[]
  }

  unprocessable (lines: string, options: { ignoreBlankLines: boolean } = { ignoreBlankLines: true }): Array<{ text: string; 'line': number }> {
    const result: Array<{ text: string; 'line': number }> = []
    lines.split('\n')
         .forEach((text, line) => {
           if (this.processOne(text) === null &&
             (!!text.trim() || !options.ignoreBlankLines))
             result.push({ text, line })
         })
    return result
  }

  processOne (line: string): Happ | null {
    const DescFromToNNRE = /(?<desc>.*)\s*\((?<from>.*)\s+to\s+(?<to>.*)\)(?:\s+"(?<nickname>.+)")?/
    const DescIncidentRE = /(?<desc>.*)\s*\((?<from>.*)\)(?:\s+"(?<nickname>.+)")?/

    const m = DescFromToNNRE.exec(line) || DescIncidentRE.exec(line)

    if (!m) return null

    const groups = m.groups as { from: string, to: string, desc: string, nickname?: string }

    const description: Happ['description'] = { name: groups.desc.trim() }
    if (groups.nickname) description.nickname = groups.nickname


    // console.log({ m, groups })
    const from = this.toMya(groups.from)
    if (from === undefined) return null

    const to = groups.to ? this.toMya(groups.to) : from // incidents have just 1 date
    if (to === undefined) return null

    const duration: GeologicDuration = {
      unit: 'Mya',
      from, to
    }

    return new Happ(duration, description)
  }

  toMya (s: string): number | undefined {
    s = s.trim()

    if (s === 'today') return 0
    if (s === 'present') return 0

    const m = /([\d,.]+)\s*(mya|years|yrs)?/.exec(s) as unknown as [string, string, string]
    if (!m) return undefined

    return m[2] === 'years' || m[2] === 'yrs' ? Number.parseFloat(m[1]) / 1_000_000 : Number.parseFloat(m[1].replace(/,/g, ''))
  }

}

function testGeologicEraProcessor () {

  const geos = fs.readFileSync(path.join(__dirname, '..', '/data/geological-eras.txt')).toString()

  const p = new GeologicEraIngester()
  console.log({ score: p.score(geos) })

  const geoTimeline = p.process(geos)

  assert.equal(p.score(''), 0)
  assert.equal(p.score('foo'), 0)
  assert.equal(p.score('Miocene (23 to 5 mya)'), 1)
  assert.equal(p.score('Pliocene (5 to 1.8 mya)'), 1)
  assert.equal(p.score('Pleistocene (1.8 mya to 11,000 yrs)'), 1)
  assert.equal(p.score('Holocene (11,000 years to today)'), 1)
  assert.equal(p.score('Phanerozoic EON (544 mya to present) "The age of visible life"'), 1)
  assert.equal(p.score('Precambrian Time (4,500 to 544 mya) "deep time on earth"'), 1)
  assert.deepEqual(p.process(''), [])
  assert.deepEqual(p.process('foo'), [])

  const miocene = p.process('Miocene (23 to 5 mya)')[0]
  assert.equal(miocene.description.name, 'Miocene')
  assert.equal(miocene.duration.from, 23)
  assert.equal(miocene.duration.to, 5)

  const plio = p.process('Pliocene (5 to 1.8 mya)')[0]
  assert.equal(plio.duration.to, 1.8, 'reads decimal points')

  const precamb = p.process('Precambrian Time (4,500 to 544 mya) "deep time on earth"')[0]
  assert.equal(precamb.duration.from, 4500, 'ignores commas in numbers')
  assert.equal(precamb.description.name, 'Precambrian Time')
  assert.equal(precamb.description.nickname, 'deep time on earth', 'picks out nickname')

  const bb = 'The Big Bang (13,700 mya)'
  assert.equal(p.score(bb), 1, 'matches incident')
  const big = p.process(bb)[0]
  assert.equal(big.duration.from, 13700)
  assert.equal(big.duration.to, 13700)
}

testGeologicEraProcessor()
