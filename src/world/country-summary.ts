import {type ISO2CountryCode, type OfficialLanguages, teenyDb} from './teeny-db.ts';
import {ComponentBwilder, assertValidTagName} from '@ndp-software/component-bwilder';
import {maybeFetchText} from './util.ts'

type PanelContext = {root: HTMLElement, 'data-iso2': string, locale: string}
type MainContext = {root: HTMLElement, 'data-iso2': string, mode: string, locale: string}


function panel(name: string) {
  const panelTag = `country-summary-${name}-panel`
  assertValidTagName(panelTag)

  return new ComponentBwilder()
    .wTagName(panelTag)
    .wShadowDOM('none')
    .wAttr('data-iso2', { onChange: true })
    .wAttr('locale', { onChange: true })
}

panel('name')
  .wRender(function (context: PanelContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    const listFormat = new Intl.ListFormat('en-US', {type: 'conjunction', style: 'narrow'});
    const nameEng = teenyDb.countryName(iso2);
    const langs = teenyDb.langs(iso2) || [];
    const lang = (langs[0] || 'en-US') as OfficialLanguages;
    const name = teenyDb.countryName(iso2, lang);
    context.root.innerHTML = `
      <div class="flag">${teenyDb.flagEmoji(iso2)}</div>
      <h2>${nameEng}</h2>
      ${name && name !== nameEng ? `<h3>Name [${lang}]</h3><p>${name}</p>` : ''}
      <h3>ISO-3166</h3>
      <p>${listFormat.format([teenyDb.misc(iso2, 'ISO3166-1-Alpha-2')!, teenyDb.misc(iso2, 'ISO3166-1-Alpha-3')!])}</p>
      <h3>Capital</h3>
      <p>${teenyDb.misc(iso2, 'Capital')}</p>
   `;
  })
  .bwild()

panel('language')
  .wRender(function (context: PanelContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    const listFormat = new Intl.ListFormat('en-US', {type: 'conjunction', style: 'narrow'});
    const nameEng = teenyDb.countryName(iso2);
    const langs = teenyDb.langs(iso2) || [];
    const langsStr = listFormat.format(langs);
    context.root.innerHTML = `
      <h2>${nameEng}</h2>
      <h3>Official Language${langs.length > 1 ? 's' : ''}</h3>
      <p>${langsStr}</p>
    `;
  })
  .bwild()

panel('currency')
  .wRender(function (context: PanelContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    const codes = teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code')?.split(',') ?? [];
    const names = teenyDb.misc(iso2, 'ISO4217-currency_name')?.split(',') ?? [];
    const currencies = (teenyDb.misc(iso2, 'ISO4217-currency_alphabetic_code') ?? '').split(',');
    const locale = context.locale || 'en-US';
    const monies = currencies.map(currency => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(1234));
    const asDollar = new Intl.NumberFormat(locale, {style: 'currency', currency: 'USD'}).format(1234);
    context.root.innerHTML = `
      <h2>${nameEng}</h2>
      <h3>Currency</h3>
      ${codes.map((code, idx) => `<p>${code}</p><p>&ldquo;${names[idx] ?? names[0]}&rdquo;</p>`).join('')}
      <h3>Local Currency</h3>
${monies.map(money => `<p>${money}</p>`).join('')}
<h3>U.S. Dollar</h3>
<p>${asDollar}</p>
    `;
  })
  .bwild()


panel('numbers')
  .wRender(function (context: PanelContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    const locale = context.locale || 'en-US';
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

    context.root.innerHTML = `
      <h2>${nameEng}</h2>
      <h3>Number</h3>
      <p>${formattedNum1}<p>
      <h3>Meters</h3>
      <p>${meters}</p>
      <h3>Kilograms</h3>
      <p>${kilos}</p>
    `;
  })
  .bwild()



panel('tech')
  .wRender(function (context: PanelContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    context.root.innerHTML = `
      <h2>${nameEng}</h2>
      <h3>Dial</h3>
      <p>+${teenyDb.misc(iso2, 'Dial')}</p>
      <h3>TLD</h3>
      <p><i>&lt;domain&gt;</i>${teenyDb.misc(iso2, 'TLD')}</p>
    `;
  })
  .bwild()


panel('time')
  .wRender(function (context: PanelContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    const nameEng = teenyDb.countryName(iso2);
    const date = new Date()
    context.root.innerHTML = `
      <h2>${nameEng}</h2>
      <h3>Time</h3>
      <p>${date.toLocaleTimeString(context.locale, {timeStyle: 'short'})}</p>
      <p>${date.toLocaleTimeString(context.locale, {timeStyle: 'medium'})}</p>
      <p>${date.toLocaleTimeString(context.locale, {timeStyle: 'long'})}</p>
      <p>${date.toLocaleTimeString(context.locale, {timeStyle: 'full'})}</p>
      <h3>Date</h3>
      <p>${date.toLocaleDateString(context.locale, {dateStyle: 'short'})}</p>
      <p>${date.toLocaleDateString(context.locale, {dateStyle: 'medium'})}</p>
      <p>${date.toLocaleDateString(context.locale, {dateStyle: 'long'})}</p>
      <p>${date.toLocaleDateString(context.locale, {dateStyle: 'full'})}</p>
    `;
  })
  .bwild()

  
const stylesheetPromise = maybeFetchText(new URL('../country-summary.css', import.meta.url))

export default new ComponentBwilder()
  .wTagName('country-summary')
  .wShadowDOM('open')
  .wAttr('data-iso2', { onChange: true })
  .wAttr('mode', { onChange: true })
  .wAttr('locale', { onChange: true })
  .wCSS(await stylesheetPromise)
  .wRender(function (context: MainContext) {
    const iso2 = context['data-iso2'] as ISO2CountryCode;
    let frame = context.root.querySelector('.frame') as HTMLElement;
    if (!frame) {
      context.root.innerHTML = `<div class="frame"></div>`;
      frame = context.root.querySelector('.frame') as HTMLElement;
    }
    if (!iso2) {
      frame.innerHTML = '';
      return
    }
    const locale = context.locale || 'en-US';
    switch (context.mode ?? 'name') {
      case 'name': {
        frame.innerHTML = `<country-summary-name-panel data-iso2="${iso2}" locale="${locale}"></country-summary-name-panel>`;
        break
      }
      case 'language': {
        frame.innerHTML = `<country-summary-language-panel data-iso2="${iso2}" locale="${locale}"></country-summary-language-panel>`;
        break
      }
      case 'currency': {
        frame.innerHTML = `<country-summary-currency-panel data-iso2="${iso2}" locale="${locale}"></country-summary-currency-panel>`;
        break
      }
      case 'numbers': {
        frame.innerHTML = `<country-summary-numbers-panel data-iso2="${iso2}" locale="${locale}"></country-summary-numbers-panel>`;
        break
      }
      case 'tech': {
        frame.innerHTML = `<country-summary-tech-panel data-iso2="${iso2}" locale="${locale}"></country-summary-tech-panel>`;
        break
      }
      case 'time': {
        frame.innerHTML = `<country-summary-time-panel data-iso2="${iso2}" locale="${locale}"></country-summary-time-panel>`;
        break
      }
      default: {
        frame.innerHTML = `???`;
      }
    }
    return
  })
  .bwild()

