import {type ISO2CountryCode, teenyDb} from './teeny-db.ts';
import {RiggedQueue} from '@ndp-software/util';
import {ComponentBwilder, type TagName} from '@ndp-software/component-bwilder';

const gLanguages = new RiggedQueue<string>(10, [navigator.language]);


const LocaleSelector = (new ComponentBwilder())
  .wTagName('locale-selector' as TagName)
  .wShadowDOM('none')
  .wObservedAttr('data-country', function (this: {root: HTMLElement}, {newValue}) {
    if (!newValue) return

    const newLocale = addCountryLocales(this, newValue as ISO2CountryCode);
    if (!newLocale) return

    // if a locale is locked, we ignore changes to data-country and just use the locked locale
    if (this.root.querySelector('segmented-buttons')!.hasAttribute('locked')) {
      const lockedLocale = this.root.querySelector('segmented-buttons')!.getAttribute('data-locked')
      gLanguages.use(lockedLocale!)
    } else {
      this.root.querySelector('segmented-buttons')!.setAttribute('data-value', newLocale)
      this.root.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value: newLocale}}))
    }

  })
  .wRender(function () {
    console.log('rendering locale buttons with  languages:', gLanguages.peek(), this)
    if (!this.root.querySelector('segmented-buttons'))
      this.root.innerHTML = '<segmented-buttons lockable required />'
    const buttons = this.root.firstChild as HTMLElement
    buttons.innerHTML = gLanguages.peek().map(lang =>
      `<div slot='option' data-value="${lang}">${lang}</div>`
    ).join('')
  })
  .wPostMountFn(function () {
    gLanguages.onChange(this.rerender)
  })
  .build();

function addCountryLocales(context, countryCode: ISO2CountryCode) {
  const countryLocales = teenyDb.langs(countryCode);
  console.log(` got country locales for ${countryCode}:`, countryLocales)
  if (!countryLocales) return
  gLanguages.add(...countryLocales)
  context.querySelector('segmented-buttons')!.setAttribute('suggested', countryLocales.join(','))
  return countryLocales[0]
}


export default LocaleSelector;