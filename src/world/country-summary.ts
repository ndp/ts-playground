import {ISO2CountryCode, OfficialLanguages, teenyDb} from './teeny-db.js';
import {maybeFetchText} from './util.js'

class CountrySummary extends HTMLElement {
    static stylesheetPromise: Promise<string>;

    static get observedAttributes() { return ['data-iso2']; }
    private root: ShadowRoot;

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });

        const container = document.createElement('div');
        container.className = 'root';
        this.root.appendChild(container);
    }

    async connectedCallback() {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(await CountrySummary.stylesheetPromise)
        this.root.adoptedStyleSheets = [sheet]

        this.refresh();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
        if (name === 'data-iso2' && oldVal !== newVal) this.refresh();
    }

    refresh() {
        const iso2 = this.getAttribute('data-iso2') as ISO2CountryCode;
        const container = this.root.querySelector('.root') as HTMLElement;
        if (!container) return;
        if (!iso2) {
            container.innerHTML = '';
            return;
        }

        const nameEng = teenyDb.countryName(iso2);
        const langs = teenyDb.langs(iso2) || [];
        const lang = (langs[0] || 'en-US') as OfficialLanguages;
        const name = teenyDb.countryName(iso2, lang);
        const listFormat = new Intl.ListFormat('en-US', { type: 'conjunction', style: 'narrow' });
        const langsStr = listFormat.format(langs);

        const codes = teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code')?.split(',') ?? [];
        const names = teenyDb.misc(iso2, 'ISO4217-currency_name')?.split(',') ?? [];


        container.innerHTML = `
      <h2>ISO-3166</h2>
      <div class="flag">${teenyDb.flagEmoji(iso2)}</div>
      <p>${listFormat.format([teenyDb.misc(iso2, 'ISO3166-1-Alpha-2')!, teenyDb.misc(iso2, 'ISO3166-1-Alpha-3')!])}</p>
      <h2 class="full">Name</h2>
      <p class="full">${nameEng}</p>
      ${name && name !== nameEng ? `<h2 class="full">Name [${lang}]</h2><p class="full">${name}</p>` : ''}
      <h2 class="full">Capital</h2>
      <p class="full">${teenyDb.misc(iso2, 'Capital')}</p>
      <h2 class="full">Language${langs.length > 1 ? 's' : ''}</h2>
      <p class="full">${langsStr}</p>
      <h2>Dial</h2>
      <h2>TLD</h2>
      <p>+${teenyDb.misc(iso2, 'Dial')}</p>
      <p><i>&lt;domain&gt;</i>${teenyDb.misc(iso2, 'TLD')}</p>
      <h2 class="full">Currency</h2>
      ${codes.map((code, idx) => `<p>${code}</p><p>${names[idx] ?? names[0]}</p>`).join('')}
    `;
    }
}

CountrySummary.stylesheetPromise = maybeFetchText(new URL('../../src/world/country-summary.css', import.meta.url))


customElements.define('country-summary', CountrySummary);
export default CountrySummary;
