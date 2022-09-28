import { strict as assert } from 'assert'
import fs from 'fs'
import { Happ } from './Happ'

export class GeologicEraProcessor {

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
    const m = /(.*)\s*\((.*)\s+to\s+(.*)\)/.exec(line)
    if (!m) return null

    const [, desc, fromToken, toToken] = m

    const f = this.toMya(fromToken)
    const t = this.toMya(toToken)

    // console.log({ desc, fromToken, toToken, f, t })

    if (f === undefined) return null
    if (t === undefined) return null

    return new Happ(
      {
        unit: 'Mya',
        from: f, to: t
      }, { name: desc.trim() })
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

  const geos = fs.readFileSync(__dirname + '/geological-eras.txt').toString()

  const p = new GeologicEraProcessor()
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
  assert.equal(plio.duration.to, 1.8)

  const prec = p.process('Precambrian Time (4,500 to 544 mya) "deep time on earth"')[0]
  assert.equal(prec.duration.from, 4500)
  assert.equal(prec.duration.to, 544)
}

testGeologicEraProcessor()
