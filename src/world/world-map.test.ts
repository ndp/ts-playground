import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import WorldMap from './world-map.ts'

// WorldMap constructor calls window.addEventListener('resize', ...).
// Node.js doesn't expose a DOM window, so point it to the JSDOM instance
// that setup-jsdom.js creates and exposes as global.jsdom.
;(globalThis as any).window = (globalThis as any).jsdom.window
;(globalThis as any).SVGElement = (globalThis as any).jsdom.window.SVGElement

type WorldMapInstance = InstanceType<typeof WorldMap>

const mockPolygonCountry = {
  iso2: 'US', iso3: 'USA', name: 'United States',
  labelX: -100, labelY: 40,
  label: { lon: -100, lat: 40 },
  geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  properties: { mapcolor7: '1', subregion: 'Northern America' }
}

describe('WorldMap', () => {
  let host: WorldMapInstance

  beforeEach(() => {
    document.body.innerHTML = ''
    // Create without appending — avoids connectedCallback / fetch
    host = document.createElement('world-map') as unknown as WorldMapInstance
  })

  // ── buildCountryPath ───────────────────────────────────────────────

  it('buildCountryPath — Polygon creates SVGPathElement with correct attributes', () => {
    const path = host.buildCountryPath({ ...mockPolygonCountry, tooltip: 'United States' })
    assert.ok(path instanceof SVGElement, 'should return SVGElement')
    assert.equal(path!.getAttribute('data-iso2'), 'US')
    assert.equal(path!.getAttribute('data-iso3'), 'USA')
    assert.ok(path!.classList.contains('country'))
    assert.ok(path!.getAttribute('d')!.length > 0, 'should have path data')
  })

  it('buildCountryPath — MultiPolygon creates SVGPathElement', () => {
    const path = host.buildCountryPath({
      ...mockPolygonCountry,
      tooltip: 'US',
      geometry: { type: 'MultiPolygon' as const, coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] }
    })
    assert.ok(path instanceof SVGElement, 'should return SVGElement for MultiPolygon')
  })

  it('buildCountryPath — unknown geometry type returns null', () => {
    const path = host.buildCountryPath({
      ...mockPolygonCountry,
      tooltip: 'US',
      geometry: { type: 'Point', coordinates: [] as any }
    })
    assert.equal(path, null)
  })

  it('buildCountryPath — click on path dispatches country-click event', () => {
    const path = host.buildCountryPath({ ...mockPolygonCountry, tooltip: 'US' })!
    host.countriesGroup.appendChild(path)
    document.body.appendChild(host)

    let detail: any = null
    host.addEventListener('country-click', (e) => { detail = (e as CustomEvent).detail })
    path.dispatchEvent(new Event('click', { bubbles: true, composed: true }))

    assert.equal(detail?.iso2, 'US')
    assert.equal(detail?.iso3, 'USA')
  })

  // ── selectCountry ──────────────────────────────────────────────────

  it('selectCountry — dispatches country-selected event with iso2', () => {
    const path = host.buildCountryPath({ ...mockPolygonCountry, tooltip: 'US' })!
    host.countriesGroup.appendChild(path)
    document.body.appendChild(host)

    let detail: any = null
    host.addEventListener('country-selected', (e) => { detail = (e as CustomEvent).detail })
    host.selectCountry('US')

    assert.equal(detail?.iso2, 'US')
  })

  it('selectCountry — same iso2 twice fires event only once', () => {
    const path = host.buildCountryPath({ ...mockPolygonCountry, tooltip: 'US' })!
    host.countriesGroup.appendChild(path)
    document.body.appendChild(host)

    let count = 0
    host.addEventListener('country-selected', () => count++)
    host.selectCountry('US')
    host.selectCountry('US')

    assert.equal(count, 1)
  })

  it('selectCountry(null) — clears selection, no event fired', () => {
    document.body.appendChild(host)

    let fired = false
    host.addEventListener('country-selected', () => { fired = true })
    host.selectCountry(null)

    assert.equal(fired, false)
  })

  // ── deselectAllCountries ───────────────────────────────────────────

  it('deselectAllCountries — removes selected class from all paths', () => {
    const p1 = host.buildCountryPath({ ...mockPolygonCountry, tooltip: 'US' })!
    const p2 = host.buildCountryPath({ ...mockPolygonCountry, iso2: 'CA', tooltip: 'CA' })!
    p1.classList.add('selected')
    p2.classList.add('selected')
    host.countriesGroup.appendChild(p1)
    host.countriesGroup.appendChild(p2)

    host.deselectAllCountries()

    assert.equal(p1.classList.contains('selected'), false)
    assert.equal(p2.classList.contains('selected'), false)
  })

  // ── setLabelResolver ───────────────────────────────────────────────

  it("setLabelResolver('flag') — adds flag-labels class, removes others", () => {
    host.setLabelResolver('flag')
    assert.ok(host.svg.classList.contains('flag-labels'))
    assert.ok(!host.svg.classList.contains('tiny-labels'))
    assert.ok(!host.svg.classList.contains('small-labels'))
    assert.ok(!host.svg.classList.contains('med-labels'))
  })

  it("setLabelResolver('name') then 'iso3' — classes swap", () => {
    host.setLabelResolver('name')
    assert.ok(host.svg.classList.contains('tiny-labels'))
    assert.ok(!host.svg.classList.contains('small-labels'))

    host.setLabelResolver('iso3')
    assert.ok(host.svg.classList.contains('small-labels'))
    assert.ok(!host.svg.classList.contains('tiny-labels'))
  })

  it('setLabelResolver(null) — removes all label classes', () => {
    host.setLabelResolver('flag')
    host.setLabelResolver(null)
    assert.ok(!host.svg.classList.contains('flag-labels'))
    assert.ok(!host.svg.classList.contains('tiny-labels'))
    assert.ok(!host.svg.classList.contains('small-labels'))
    assert.ok(!host.svg.classList.contains('med-labels'))
  })

  // ── buildCountryLabel ──────────────────────────────────────────────

  it("buildCountryLabel with 'iso2' resolver returns SVGTextElement with iso2", async () => {
    host.setLabelResolver('iso2')
    const label = await host.buildCountryLabel(mockPolygonCountry)
    assert.ok(label instanceof SVGElement)
    assert.equal(label!.textContent, 'US')
  })

  it("buildCountryLabel with 'name' resolver returns country name", async () => {
    host.setLabelResolver('name')
    const label = await host.buildCountryLabel(mockPolygonCountry)
    assert.equal(label!.textContent, 'United States')
  })

  it('buildCountryLabel with null resolver (default) returns null', async () => {
    const label = await host.buildCountryLabel(mockPolygonCountry)
    assert.equal(label, null)
  })

  it('buildCountryLabel with async function resolver awaits result', async () => {
    host.setLabelResolver(async (iso2) => iso2 === 'US' ? 'Custom Label' : null)
    const label = await host.buildCountryLabel(mockPolygonCountry)
    assert.equal(label!.textContent, 'Custom Label')
  })

  it('labels map overrides resolver', async () => {
    host.labels['US'] = 'Overridden'
    host.setLabelResolver('iso2')
    const label = await host.buildCountryLabel(mockPolygonCountry)
    assert.equal(label!.textContent, 'Overridden')
  })
})
