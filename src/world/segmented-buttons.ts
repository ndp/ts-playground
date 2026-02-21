import {ComponentBwilder} from '@ndpsoftware/component-bwilder'

const css = await maybeFetchText(new URL('../segmented-buttons.css', import.meta.url))

type SegmentedContext = HTMLElement & {
  root: HTMLElement
  subElements: { slotEl: HTMLSlotElement | null }
}

const SegmentedButtons = new ComponentBwilder()
  .wTagName('segmented-buttons')
  .wShadowDOM('open')
  .wCSS(css)
  .wObservedAttr('data-value', function () {
    applySelectedClasses(this as unknown as HTMLElement)
  })
  .wElement('slotEl')
  .wRender(function (this: SegmentedContext) {
    const slotEl = document.createElement('slot')
    slotEl.setAttribute('name', 'option')
    this.root.appendChild(slotEl)

    return {slotEl}
  })
  .wPostMountFn(function (this: HTMLElement & SegmentedContext) {
    // Initialize from any slotted element marked selected
    const selectedEl = this.root.querySelector('[data-value][selected]') as HTMLElement | null
    if (selectedEl) {
      selectedEl.removeAttribute('selected')
      selectedEl.classList.add('selected')
      const val = selectedEl.getAttribute('data-value')
      if (val !== null) this.setAttribute('data-value', val)
    }
  })
  .wSlotAddedHandler(function (this: HTMLElement & SegmentedContext, _, el) {
    const handler = (ev: Event) => {
      ev.stopPropagation()
      handleSelect(this, el)
    }
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
    el.addEventListener('click', handler)
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