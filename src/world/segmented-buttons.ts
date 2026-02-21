import {ComponentBwilder} from '@ndpsoftware/component-bwilder'

const css = await maybeFetchText(new URL('../segmented-buttons.css', import.meta.url))

type SegmentedContext = HTMLElement & {
  root: HTMLElement
  subElements: { slotEl: HTMLSlotElement | null }
}

/** Tracks which host elements have completed post-mount (initial selected-attr processing done). */
const mountedHosts = new WeakSet<HTMLElement>()

const SegmentedButtons = new ComponentBwilder()
  .wTagName('segmented-buttons')
  .wShadowDOM('open')
  .wCSS(css)
  .wObservedAttr('data-value', function () {
    applySelectedClasses(this as unknown as HTMLElement)
  })
  .wObservedAttr('required', function () {
    enforceRequired(this as unknown as HTMLElement & SegmentedContext)
  })
  .wElement('slotEl')
  .wRender(function (this: SegmentedContext) {
    const slotEl = document.createElement('slot')
    slotEl.setAttribute('name', 'option')
    this.root.appendChild(slotEl)

    return {slotEl}
  })
  .wPostMountFn(function (this: HTMLElement & SegmentedContext) {
    // Search light DOM (the host, not shadow root) for a slotted element pre-marked as selected
    const selectedEl = this.querySelector('[data-value][selected]') as HTMLElement | null
    if (selectedEl) {
      selectedEl.removeAttribute('selected')
      selectedEl.classList.add('selected')
      const val = selectedEl.getAttribute('data-value')
      if (val !== null) this.setAttribute('data-value', val)
    }
    mountedHosts.add(this)
    enforceRequired(this)
  })
  .wSlotAddedHandler(function (this: HTMLElement & SegmentedContext, _, el) {
    const handler = (ev: Event) => {
      ev.stopPropagation()
      handleSelect(this, el)
    }
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
    el.addEventListener('click', handler)
    // Only enforce after mount so we don't interfere with the initial `selected` attribute scan.
    // Pass `el` as a fallback for environments where assignedElements() may be empty at this point.
    if (mountedHosts.has(this)) enforceRequired(this, el)
    applySelectedClasses(this)
    return () => el.removeEventListener('click', handler)
  })
  .wPostRenderFn(function (this: HTMLElement & SegmentedContext) {
    applySelectedClasses(this)
  })
  .build()

export default SegmentedButtons

function handleSelect(host: HTMLElement & SegmentedContext, el: HTMLElement) {
  const val = el.getAttribute('data-value')
  const oldVal = host.getAttribute('data-value')

  if (oldVal === val) {
    // When required, clicking the selected option does nothing
    if (host.hasAttribute('required')) return
    host.removeAttribute('data-value')
    emitChange(host, null, oldVal)
    applySelectedClasses(host)
    return
  }

  if (val !== null) host.setAttribute('data-value', val)
  else host.removeAttribute('data-value')

  if (oldVal !== val) emitChange(host, val, oldVal)
  applySelectedClasses(host)
}

/**
 * When `required` is present and no option is currently selected,
 * auto-select the first non-disabled slotted option.
 * @param fallback - optional element to consider when `assignedElements()` is empty
 *                   (e.g. in JSDOM where slot assignment may lag behind DOM insertion)
 */
function enforceRequired(host: HTMLElement & SegmentedContext, fallback?: HTMLElement) {
  if (!host.hasAttribute('required')) return
  if (host.hasAttribute('data-value')) return

  const slot = host.subElements?.slotEl
  const assigned = (slot?.assignedElements({flatten: true}) ?? []) as HTMLElement[]
  const candidates = assigned.length > 0 ? assigned : (fallback ? [fallback] : [])
  const first = candidates.find(
    (el) => el instanceof HTMLElement && el.hasAttribute('data-value') && !el.hasAttribute('disabled')
  ) as HTMLElement | undefined

  if (!first) return
  const val = first.getAttribute('data-value')!
  host.setAttribute('data-value', val)
  applySelectedClasses(host)
  // No change event here — this is an automatic enforcement, not user interaction
}

function applySelectedClasses(host: HTMLElement & SegmentedContext) {
  const slot = host.subElements?.slotEl
  const value = host.getAttribute('data-value')
  const assigned = slot?.assignedElements({flatten: true}) ?? []

  assigned.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    node.classList.toggle('selected', value !== null && node.getAttribute('data-value') === value)
  })
}

function emitChange(host: HTMLElement, value: string | null, oldValue: string | null) {
  const changed = oldValue !== value
  if (!changed) return
  host.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value}}))
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