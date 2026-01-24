import {type ISO2CountryCode, type OfficialLanguages, teenyDb} from '../../world/teeny-db.ts';
import {ComponentBwilder} from '../componentBwilder.ts';
import {maybeFetchText} from '../../world/util.ts'

const stylesheetPromise = maybeFetchText(new URL('../../src/world/country-summary.css', import.meta.url))


new ComponentBwilder()
  .wTagName('country-summary-name-panel')
  .wShadowDOM('none')
  .wObservedAttr('data-iso2')
  .wObservedAttr('locale')
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    const listFormat = new Intl.ListFormat('en-US', {type: 'conjunction', style: 'narrow'});
    const nameEng = teenyDb.countryName(iso2);
    const langs = teenyDb.langs(iso2) || [];
    const lang = (langs[0] || 'en-US') as OfficialLanguages;
    const name = teenyDb.countryName(iso2, lang);
    this.root.innerHTML = `
      <h2>ISO-3166</h2>
      <div class="flag">${teenyDb.flagEmoji(iso2)}</div>
      <p>${listFormat.format([teenyDb.misc(iso2, 'ISO3166-1-Alpha-2')!, teenyDb.misc(iso2, 'ISO3166-1-Alpha-3')!])}</p>
      <h2>Name</h2>
      <p>${nameEng}</p>
      ${name && name !== nameEng ? `<h2>Name [${lang}]</h2><p>${name}</p>` : ''}
    `;
    return {};
  })
  .build()

new ComponentBwilder()
  .wTagName('country-summary-language-panel')
  .wShadowDOM('none')
  .wObservedAttr('data-iso2')
  .wObservedAttr('locale')
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    const listFormat = new Intl.ListFormat('en-US', {type: 'conjunction', style: 'narrow'});
    const nameEng = teenyDb.countryName(iso2);
    const langs = teenyDb.langs(iso2) || [];
    const lang = (langs[0] || 'en-US') as OfficialLanguages;
    const langsStr = listFormat.format(langs);
    this.root.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Official Language${langs.length > 1 ? 's' : ''}</h2>
      <p>${langsStr}</p>
    `;
    return {};
  })
  .build()

new ComponentBwilder()
  .wTagName('country-summary-currency-panel')
  .wShadowDOM('none')
  .wObservedAttr('data-iso2')
  .wObservedAttr('locale')
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    const codes = teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code')?.split(',') ?? [];
    const names = teenyDb.misc(iso2, 'ISO4217-currency_name')?.split(',') ?? [];
    const currencies = (teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code') ?? '').split(',');
    const locale = this.locale || 'en-US';
    const monies = currencies.map(currency => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(1234));
    const asDollar = new Intl.NumberFormat(locale, {style: 'currency', currency: 'USD'}).format(1234);
    this.root.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Currency</h2>
      ${codes.map((code, idx) => `<p>${code}</p><p>${names[idx] ?? names[0]}</p>`).join('')}
      <h2>Local Currency</h2>
${monies.map(money => `<p>${money}</p>`).join('')}
<h2>U.S. Dollar</h2>
<p>${asDollar}</p>
    `;
    return {};
  })
  .build()


new ComponentBwilder()
  .wTagName('country-summary-numbers-panel')
  .wShadowDOM('none')
  .wObservedAttr('data-iso2')
  .wObservedAttr('locale')
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    const locale = this.locale || 'en-US';
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

    this.root.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Number</h2>
      <p>${formattedNum1}<p>
      <h2>Meters</h2>
      <p>${meters}</p>
      <h2>Kilograms</h2>
      <p>${kilos}</p>
    `;
    return {};
  })
  .build()


new ComponentBwilder()
  .wTagName('country-summary-political-panel')
  .wShadowDOM('none')
  .wObservedAttr('data-iso2')
  .wObservedAttr('locale')
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    const langs = teenyDb.langs(iso2) || [];
    const lang = (langs[0] || 'en-US') as OfficialLanguages;
    const nameEng = teenyDb.countryName(iso2);
    const name = teenyDb.countryName(iso2, lang);

    this.root.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      ${name && name !== nameEng ? `<h2>Name [${lang}]</h2><p>${name}</p>` : ''}
      <h2>Capital</h2>
      <p>${teenyDb.misc(iso2, 'Capital')}</p>
    `;
    return {};
  })
  .build()


new ComponentBwilder()
  .wTagName('country-summary-tech-panel')
  .wShadowDOM('none')
  .wObservedAttr('data-iso2')
  .wObservedAttr('locale')
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    this.root.innerHTML = `
      <h2>Name</h2>
      <p>${nameEng}</p>
      <h2>Dial</h2>
      <p>+${teenyDb.misc(iso2, 'Dial')}</p>
      <h2>TLD</h2>
      <p><i>&lt;domain&gt;</i>${teenyDb.misc(iso2, 'TLD')}</p>
    `;
    return {};
  })
  .build()


export default new ComponentBwilder()
  .wTagName('country-summary')
  .wShadowDOM('open')
  .wObservedAttr('data-iso2')
  .wObservedAttr('mode')
  .wObservedAttr('locale')
  .wCSS(await stylesheetPromise)
  .wRender(function (): {} {
    const iso2 = this['data-iso2'] as ISO2CountryCode;
    let container = this.root.querySelector('.root') as HTMLElement;
    if (!container) {
      this.root.innerHTML = `<div class="root"></div>`;
      container = this.root.querySelector('.root') as HTMLElement;
    }
    if (!iso2) {
      container.innerHTML = '';
      return {};
    }
    const locale = this.locale || 'en-US';
    switch (this.mode) {
      case 'name': {
        container.innerHTML = `<country-summary-name-panel data-iso2="${iso2}" locale="${locale}"></country-summary-name-panel>`;
        break
      }
      case 'language': {
        container.innerHTML = `<country-summary-language-panel data-iso2="${iso2}" locale="${locale}"></country-summary-language-panel>`;
        break
      }
      case 'currency': {
        container.innerHTML = `<country-summary-currency-panel data-iso2="${iso2}" locale="${locale}"></country-summary-currency-panel>`;
        break
      }
      case 'numbers': {
        container.innerHTML = `<country-summary-numbers-panel data-iso2="${iso2}" locale="${locale}"></country-summary-numbers-panel>`;
        break
      }
      case 'political': {
        container.innerHTML = `<country-summary-political-panel data-iso2="${iso2}" locale="${locale}"></country-summary-political-panel>`;
        break
      }
      case 'tech': {
        container.innerHTML = `<country-summary-tech-panel data-iso2="${iso2}" locale="${locale}"></country-summary-tech-panel>`;
        break
      }
      default: {
        container.innerHTML = `???`;
      }
    }
    return {}
  })
  .build()

