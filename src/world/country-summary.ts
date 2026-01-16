import {ISO2CountryCode, OfficialLanguages, teenyDb} from './teeny-db.js';
import {maybeFetchText} from './util.js'

class CountrySummary extends HTMLElement {
    static stylesheetPromise: Promise<string>;
    mode = 'name';

    static get observedAttributes() {
        return ['data-iso2', 'mode', 'locale'];
    }

    private root: ShadowRoot;

    constructor() {
        super();
        this.root = this.attachShadow({mode: 'open'});

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
        if (name === 'mode' && oldVal !== newVal) this.mode = newVal || 'name';
        if (oldVal !== newVal) this.refresh();
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
        const listFormat = new Intl.ListFormat('en-US', {type: 'conjunction', style: 'narrow'});
        const langsStr = listFormat.format(langs);

        const codes = teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code')?.split(',') ?? [];
        const names = teenyDb.misc(iso2, 'ISO4217-currency_name')?.split(',') ?? [];

        const currencies = teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code').split(',');
        const locale = this.getAttribute('locale') || 'en-US';
        const monies = currencies.map(currency => new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(1234));
        const asDollar = new Intl.NumberFormat(locale, {style: 'currency', currency: 'USD'}).format(1234);


        if (this.mode === 'name') {
            container.innerHTML = `
      <h2>ISO-3166</h2>
      <div class="flag">${teenyDb.flagEmoji(iso2)}</div>
      <p>${listFormat.format([teenyDb.misc(iso2, 'ISO3166-1-Alpha-2')!, teenyDb.misc(iso2, 'ISO3166-1-Alpha-3')!])}</p>
      <h2>Name</h2>
      <p>${nameEng}</p>
      ${name && name !== nameEng ? `<h2>Name [${lang}]</h2><p>${name}</p>` : ''}
    `;
            return;

        } else if (this.mode === 'language') {
            container.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Official Language${langs.length > 1 ? 's' : ''}</h2>
      <p>${langsStr}</p>
    `;
            return;
        } else if (this.mode === 'currency') {
            container.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Currency</h2>
      ${codes.map((code, idx) => `<p>${code}</p><p>${names[idx] ?? names[0]}</p>`).join('')}
      <h2>Local Currency</h2>
${monies.map(money => `<p>${money}</p>`).join('')}
<h2>U.S. Dollar</h2>
<p>${asDollar}</p>

    `;
            return;
        }

        if (this.mode === 'numbers') {


            const num1 = 1234567.89;
            const formattedNum1 = num1.toLocaleString(locale);
            const meters = new Intl.NumberFormat(locale, {
                style: 'unit',
                unit: 'meter',
                unitDisplay: 'long'
            }).format(42195.01);
            const kilos = new Intl.NumberFormat(locale, {
                style: 'unit',
                unit: 'kilogram',
                unitDisplay: 'short'
            }).format(89.5);

            container.innerHTML = `
            <h2>Name</h2>
      <p>${nameEng}</p>
<h2>Number</h2>
<p>${formattedNum1}<p>
<h2>Meters</h2>
<p>${meters}</p>
<h2>Kilograms</h2>
<p>${kilos}</p>
    `;
            return;
        }
        if (this.mode === 'political') {
            container.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      ${name && name !== nameEng ? `<h2>Name [${lang}]</h2><p>${name}</p>` : ''}
      <h2>Capital</h2>
      <p>${teenyDb.misc(iso2, 'Capital')}</p>
    `;
            return;
        } else if (this.mode === 'tech') {
            container.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Dial</h2>
      <p>+${teenyDb.misc(iso2, 'Dial')}</p>
      <h2>TLD</h2>
      <p><i>&lt;domain&gt;</i>${teenyDb.misc(iso2, 'TLD')}</p>
    `;
            return;
        }

        container.innerHTML = `
???
    `;
    }
}

CountrySummary.stylesheetPromise = maybeFetchText(new URL('../../src/world/country-summary.css', import.meta.url))


customElements.define('country-summary', CountrySummary);
export default CountrySummary;
