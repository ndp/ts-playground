// src/world/locale-buttons.ts
import {maybeFetchText} from './util.js';

const CORE_LOCALES = ['en-US', 'en', 'de', 'fr', 'es', 'ar', 'zh', 'es-ES'];
const DEFAULT_MAX_OPTIONS = 12;

class LocaleButtons extends HTMLElement {
    static stylesheetPromise: Promise<string>;
    private root: ShadowRoot;
    private slotEl: HTMLSlotElement | null = null;
    private selectedEl: HTMLElement | null = null;
    private assignedListeners = new Map<Element, EventListener>();
    private lru: string[] = []; // least-recently-used at start, most-recent at end
    private maxOptions = DEFAULT_MAX_OPTIONS;

    constructor() {
        super();
        this.root = this.attachShadow({mode: 'open'});

        const container = document.createElement('div');
        container.className = 'root';
        const slot = document.createElement('slot');
        slot.setAttribute('name', 'option');
        container.appendChild(slot);
        this.root.appendChild(container);

        this.slotEl = slot;
        this.onSlotChange = this.onSlotChange.bind(this);
    }

    async connectedCallback() {
        // adopt stylesheet if available (keeps behavior consistent with other components)
        try {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(await LocaleButtons.stylesheetPromise);
            this.root.adoptedStyleSheets = [sheet];
        } catch {
            // ignore stylesheet failures in test envs
        }

        // Ensure core locales exist
        for (const v of CORE_LOCALES) this.addOptionIfMissing(v, false);

        // apply suggested attribute if present
        const suggestedAttr = this.getAttribute('suggested');
        if (suggestedAttr) this.applySuggestedFromAttr(suggestedAttr);

        // ensure current data-value is present
        const cur = this.getAttribute('data-value');
        if (cur) this.addOptionIfMissing(cur, false);
        // initialize selection from attribute
        if (cur) {
            const el = this.getElementByDataValue(cur);
            if (el) this.handleSelect(el);
        }

        if (this.slotEl) {
            this.slotEl.addEventListener('slotchange', this.onSlotChange);
            this.updateAssignedElements();
        }
    }

    disconnectedCallback() {
        if (this.slotEl) this.slotEl.removeEventListener('slotchange', this.onSlotChange);
        this.clearAssignedListeners();
    }

    static get observedAttributes() {
        return ['data-value', 'suggested'];
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
        if (name === 'data-value' && oldVal !== newVal) {
            // ensure value exists and select it
            if (newVal) {
                this.addOptionIfMissing(newVal, false);
                const newEl = this.getElementByDataValue(newVal);
                if (newEl) this.handleSelect(newEl);
            } else {
                // clear selection
                if (this.selectedEl) {
                    this.selectedEl.classList.remove('selected');
                    this.selectedEl = null;
                }
            }
        } else if (name === 'suggested' && oldVal !== newVal) {
            if (newVal) this.applySuggestedFromAttr(newVal);
            else this.clearSuggested();
        }
    }

    private onSlotChange() {
        this.updateAssignedElements();
    }

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

        // Keep options alphabetized for user
        this.sortOptionsAlphabetically();
        // enforce maximum option count
        this.enforceLimit();
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

        // update LRU
        if (val) this.markUsed(val);

        if (oldVal !== val) this.emitChange(val);
    }

    private emitChange(value: string | null) {
        this.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value}}));
    }

    private getElementByDataValue(value: string | null): HTMLElement | null {
        if (value === null) return null;
        return this.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
    }

    private addOptionIfMissing(value: string, suggested = false) {
        if (!value) return;
        if (this.getElementByDataValue(value)) {
            // ensure suggested flag updated if applicable
            const el = this.getElementByDataValue(value)!;
            if (suggested) el.classList.add('suggested');
            return;
        }
        const btn = document.createElement('button');
        btn.setAttribute('slot', 'option');
        btn.setAttribute('data-value', value);
        btn.textContent = value;
        if (suggested) btn.classList.add('suggested');
        // append to host light DOM so slot picks it up
        this.appendChild(btn);
        // update LRU as newly created should be considered recently-used
        this.markUsed(value);
    }

    private applySuggestedFromAttr(attr: string) {
        const parts = attr.split(',').map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
            this.addOptionIfMissing(p, true);
        }
        // mark suggested class for existing ones too
        for (const el of Array.from(this.querySelectorAll('[data-value]')) as HTMLElement[]) {
            const val = el.getAttribute('data-value')!;
            if (parts.includes(val)) el.classList.add('suggested');
            else el.classList.remove('suggested');
        }
        this.sortOptionsAlphabetically();
        this.enforceLimit();
    }

    private clearSuggested() {
        for (const el of Array.from(this.querySelectorAll('[data-value]')) as HTMLElement[]) {
            el.classList.remove('suggested');
        }
    }

    private sortOptionsAlphabetically() {
        const opts = Array.from(this.querySelectorAll('[slot="option"][data-value]')) as HTMLElement[];
        opts.sort((a, b) => {
            const va = (a.getAttribute('data-value') || '').toLowerCase();
            const vb = (b.getAttribute('data-value') || '').toLowerCase();
            if (va < vb) return -1;
            if (va > vb) return 1;
            return 0;
        });
        for (const el of opts) this.appendChild(el); // reorder in DOM
    }

    private markUsed(value: string) {
        const idx = this.lru.indexOf(value);
        if (idx !== -1) this.lru.splice(idx, 1);
        this.lru.push(value);
    }

    private enforceLimit() {
        const allOpts = Array.from(this.querySelectorAll('[slot="option"][data-value]')) as HTMLElement[];
        if (allOpts.length <= this.maxOptions) return;

        // Compute removable values (non-core)
        const nonCore = allOpts.map(el => el.getAttribute('data-value')!).filter(v => !CORE_LOCALES.includes(v));
        // Determine order by LRU (oldest first)
        const orderedNonCore = this.lru.filter(v => nonCore.includes(v));
        // Append any non-core not in LRU (treat as oldest)
        for (const v of nonCore) {
            if (!orderedNonCore.includes(v)) orderedNonCore.unshift(v);
        }

        let toRemoveCount = allOpts.length - this.maxOptions;
        for (const val of orderedNonCore) {
            if (toRemoveCount <= 0) break;
            const el = this.getElementByDataValue(val);
            if (!el) continue;
            // do not remove current selection
            if (this.selectedEl === el) continue;
            // remove element from DOM and cleanup listeners
            const handler = this.assignedListeners.get(el);
            if (handler) {
                el.removeEventListener('click', handler);
                this.assignedListeners.delete(el);
            }
            el.remove();
            // remove from LRU
            const idx = this.lru.indexOf(val);
            if (idx !== -1) this.lru.splice(idx, 1);
            toRemoveCount--;
        }
    }

    // Allow externally tuning maxOptions via property
    set maxOptionsCount(n: number) {
        if (Number.isFinite(n) && n > CORE_LOCALES.length) {
            this.maxOptions = Math.max(CORE_LOCALES.length, Math.floor(n));
            this.enforceLimit();
        }
    }

    get maxOptionsCount() {
        return this.maxOptions;
    }
}

LocaleButtons.stylesheetPromise = maybeFetchText(new URL('../../src/world/locale-buttons.css', import.meta.url));

customElements.define('locale-buttons', LocaleButtons);
export default LocaleButtons;
