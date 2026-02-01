// typescript
import {maybeFetchText} from './util.js';
import {ComponentBwilder} from '../component/componentBwilder.ts'

const css = await maybeFetchText(new URL('../../src/world/segmented-buttons.css', import.meta.url));

class SegmentedButtons extends (
  new ComponentBwilder()
    .wTagName('base-segmented-button')
    .wShadowDOM('open')
    .wCSS(css)
    .wElement('slotEl')
    .wRender(function (this: { root: HTMLElement }) {
      const slotEl = document.createElement('slot')
      slotEl.setAttribute('name', 'option');
      this.root.appendChild(slotEl);

      // Initialize selected element from option element, if any
      const selectedEl = this.root.querySelector('[data-value][selected]') as HTMLElement | null;
      if (selectedEl) {
        selectedEl.removeAttribute('selected');
        selectedEl.classList.add('selected');
        const val = selectedEl.getAttribute('data-value');
        this.root.setAttribute('data-value', val || '');
      }

      return {selectedEl, slotEl};
    })
    .build()) {
  private slotEl: HTMLSlotElement | null = null;
  private selectedEl: HTMLElement | null = null;
  private assignedListeners = new Map<Element, EventListener>();

  // constructor() {
  //   super();
  //
  // }
  //
  async connectedCallback() {

    super.connectedCallback();

    if (this.slotEl) {
      this.slotEl.addEventListener('slotchange', this.onSlotChange);
      this.updateAssignedElements(); // initial wiring
    }

  }

  disconnectedCallback() {
    if (this.slotEl) this.slotEl.removeEventListener('slotchange', this.onSlotChange);
    this.clearAssignedListeners();
  }

  private onSlotChange() {
    this.updateAssignedElements();
  }

  // Modern-browser-only: use slotted elements directly
  private updateAssignedElements() {
    if (!this.slotEl) return;

    const assigned = new Set<Element>(this.slotEl.assignedElements({flatten: true}));

    // Remove listeners from elements no longer assigned
    for (const el of Array.from(this.assignedListeners.keys())) {
      if (!assigned.has(el)) {
        const fn = this.assignedListeners.get(el)!;
        el.removeEventListener('click', fn);
        this.assignedListeners.delete(el);
        if (this.selectedEl === el) {
          this.selectedEl = null;
          this.removeAttribute('data-value');
          this.emitChange(null);
        }
      }
    }

    // Add listeners to newly assigned elements
    for (const node of assigned) {
      if (!(node instanceof Element)) continue;
      const el = node as HTMLElement;
      if (!el.hasAttribute('data-value')) continue;

      if (!this.assignedListeners.has(el)) {
        const handler = (ev: Event) => {
          ev.stopPropagation();
          this.handleSelect(el);
        };
        el.addEventListener('click', handler);
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        this.assignedListeners.set(el, handler);
      }
    }
  }

  private clearAssignedListeners() {
    for (const [el, fn] of Array.from(this.assignedListeners.entries())) {
      el.removeEventListener('click', fn);
      this.assignedListeners.delete(el);
    }
  }

  private handleSelect(el: HTMLElement) {
    const val = el.getAttribute('data-value');
    const oldVal = this.getAttribute('data-value');

    if (this.selectedEl === el) {
      this.selectedEl.classList.remove('selected');
      this.selectedEl = null;
      this.removeAttribute('data-value');
      if (oldVal !== null) this.emitChange(null);
      return;
    }

    if (this.selectedEl) this.selectedEl.classList.remove('selected');
    el.classList.add('selected');
    this.selectedEl = el;

    if (val !== null) this.setAttribute('data-value', val);
    else this.removeAttribute('data-value');

    if (oldVal !== val) this.emitChange(val);
  }

  private emitChange(value: string | null) {
    this.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value}}));
  }
}


customElements.define('segmented-buttons', SegmentedButtons);
export default SegmentedButtons;
