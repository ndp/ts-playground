import {ComponentBwilder} from '@ndp-software/component-bwilder'

const css = await maybeFetchText(new URL('../segmented-buttons.css', import.meta.url))

type HTMLElementWithSubElements = HTMLElement  & {
  subElements?: { slotEl: HTMLSlotElement | null }
}

type SegmentedButtonsContext = HTMLElementWithSubElements & {
  root: HTMLElement
}


/** Tracks which host elements have completed post-mount (initial selected-attr processing done). */
const mountedHosts = new WeakSet<HTMLElement>()

const SegmentedButtons = new ComponentBwilder()
  .wTagName('segmented-buttons')
  .wShadowDOM('open')
  .wCSS(css)
  .wObservedAttr('data-value', function (this: SegmentedButtonsContext) {
    applySelectedClasses(this)
  })
  .wObservedAttr('required', function (this: SegmentedButtonsContext) {
    enforceRequired(this)
  })
  .wObservedAttr('multi', function (this: SegmentedButtonsContext) {
    normalizeSelectionForMode(this)
  })
  .wElement<'slotEl', HTMLSlotElement>('slotEl')
  .wRender(function () {
    const slotEl = document.createElement('slot')
    slotEl.setAttribute('name', 'option')
    this.root.appendChild(slotEl)

    return {slotEl}
  })
  .wPostMountFn(function () {
    // Search light DOM (the host, not shadow root) for any slotted elements pre-marked as selected
    const preselected = Array.from(this.querySelectorAll('[data-value][selected]')) as HTMLElement[]
    if (preselected.length > 0) {
      const values: string[] = []
      preselected.forEach((el) => {
        el.removeAttribute('selected')
        el.classList.add('selected')
        const val = el.getAttribute('data-value')
        if (val !== null) values.push(val)
      })
      setSelectedValues(this, values, {emitChange: false})
    }
    mountedHosts.add(this)
    enforceRequired(this as HTMLElementWithSubElements)
  })
  .wSlotAddedHandler(function<T extends HTMLElement> (context: T, el: HTMLElement) {
    const handler = (ev: Event) => {
      ev.stopPropagation()
      handleSelect(context, el)
    }
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
    el.addEventListener('click', handler)
    // Only enforce after mount so we don't interfere with the initial `selected` attribute scan.
    // Pass `el` as a fallback for environments where assignedElements() may be empty at this point.
    if (mountedHosts.has(context)) enforceRequired(context, el)
    applySelectedClasses(context)
    return () => el.removeEventListener('click', handler)
  })
  .wPostRenderFn(function (this: HTMLElementWithSubElements) {
    applySelectedClasses(this)
  })
  .build()

export default SegmentedButtons

function handleSelect(host: HTMLElementWithSubElements, el: HTMLElement) {
  const val = el.getAttribute('data-value')
  if (val === null) return

  if (isMulti(host)) {
    const selected = getSelectedValues(host)
    const has = selected.includes(val)

    if (has) {
      if (host.hasAttribute('required') && selected.length === 1) return
      setSelectedValues(host, selected.filter((v) => v !== val))
      return
    }

    setSelectedValues(host, [...selected, val])
    return
  }

  const current = getSelectedValues(host)[0] ?? null

  if (current === val) {
    // When required, clicking the selected option does nothing
    if (host.hasAttribute('required')) return
    setSelectedValues(host, [])
    return
  }

  setSelectedValues(host, [val])
}

/**
 * When `required` is present and no option is currently selected,
 * auto-select the first non-disabled slotted option.
 * @param fallback - optional element to consider when `assignedElements()` is empty
 *                   (e.g. in JSDOM where slot assignment may lag behind DOM insertion)
 */
function enforceRequired(host: HTMLElementWithSubElements, fallback?: HTMLElement) {
  if (!host.hasAttribute('required')) return
  if (getSelectedValues(host).length > 0) return

  const slot = host.subElements?.slotEl
  const assigned = (slot?.assignedElements({flatten: true}) ?? []) as HTMLElement[]
  const candidates = assigned.length > 0 ? assigned : (fallback ? [fallback] : [])
  const first = candidates.find(
    (el) => el instanceof HTMLElement && el.hasAttribute('data-value') && !el.hasAttribute('disabled')
  ) as HTMLElement | undefined

  if (!first) return
  const val = first.getAttribute('data-value')!
  setSelectedValues(host, [val], {emitChange: false})
  // No change event here — this is an automatic enforcement, not user interaction
}

function applySelectedClasses(host: HTMLElementWithSubElements) {
  const slot = host.subElements?.slotEl
  const selectedValues = getSelectedValues(host)
  const assigned = slot?.assignedElements({flatten: true}) ?? []

  assigned.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const nodeValue = node.getAttribute('data-value')
    node.classList.toggle('selected', nodeValue !== null && selectedValues.includes(nodeValue))
  })
}

function normalizeSelectionForMode(host: HTMLElementWithSubElements) {
  // Re-apply data-value in the correct shape when toggling multi on/off without emitting
  setSelectedValues(host, getSelectedValues(host), {emitChange: false})
  enforceRequired(host)
}

function setSelectedValues(host: HTMLElementWithSubElements, values: string[], options?: {emitChange?: boolean}) {
  const unique = dedupe(values)
  const multi = isMulti(host)
  const normalized = multi ? unique : unique.slice(0, 1)
  const prev = getSelectedValues(host)

  if (normalized.length === 0) host.removeAttribute('data-value')
  else host.setAttribute('data-value', multi ? normalized.join(',') : normalized[0])

  const newValue = multi ? normalized : normalized[0] ?? null
  const oldValue = multi ? prev : prev[0] ?? null

  if (options?.emitChange !== false) emitChange(host, newValue, oldValue)
  applySelectedClasses(host)
}

function getSelectedValues(host: HTMLElement) {
  const raw = host.getAttribute('data-value')
  if (!raw) return []
  return dedupe(
    raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  )
}

function dedupe(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  values.forEach((val) => {
    if (seen.has(val)) return
    seen.add(val)
    result.push(val)
  })
  return result
}

function isMulti(host: HTMLElement) {
  return host.hasAttribute('multi')
}

function emitChange(host: HTMLElement, value: string | string[] | null, oldValue: string | string[] | null) {
  if (selectionsEqual(value, oldValue)) return
  host.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value}}))
}

function selectionsEqual(a: string | string[] | null, b: string | string[] | null) {
  const arrA = Array.isArray(a) ? a : a === null ? [] : [a]
  const arrB = Array.isArray(b) ? b : b === null ? [] : [b]
  if (arrA.length !== arrB.length) return false
  return arrA.every((val, idx) => val === arrB[idx])
}

export async function maybeFetchText(url: URL) {
  try {
    const res = await fetch(url.href)
    if (res.ok)
      return await res.text()
  } catch (e) {
    // ignore and return empty
  }
  return ''
}