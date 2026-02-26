import {type ISO2CountryCode, teenyDb} from './teeny-db.ts';
import {RiggedQueue} from '@ndp-software/util';
import {ComponentBwilder, type TagName} from '@ndp-software/component-bwilder';

const gLanguages = new RiggedQueue<string>(10, [navigator.language]);


const LocaleSelector = (new ComponentBwilder())
  .wTagName('locale-selector' as TagName)
  .wShadowDOM('none')
  .wElement('segmentedButtons')
  .wObservedAttr('data-country', function ({newValue}) {
    if (!newValue) return

    const countryLocales = teenyDb.langs(newValue as ISO2CountryCode);
    console.log(` got country locales for ${newValue}:`, countryLocales)
    if (!countryLocales || countryLocales.length === 0) return

    const isLocked = this.subElements.segmentedButtons!.hasAttribute('locked')
    if (isLocked) {
      const lockedLocale = this.subElements.segmentedButtons!.getAttribute('data-locked')
      console.log(`marking locked locale ${lockedLocale} as used in gLanguages`)
      gLanguages.use(lockedLocale!)
    }
    gLanguages.add(...countryLocales)
    this.subElements.segmentedButtons!.setAttribute('suggested', countryLocales.join(','))

    if (countryLocales.length === 0 || isLocked) return

    this.subElements.segmentedButtons!.setAttribute('data-value', countryLocales[0])
    this.root.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value: countryLocales[0]}}))

  })
  .wRender(function () {
    console.log('rendering locale buttons with  languages:', gLanguages.peek(), this)

    let segmentedButtons = this.subElements.segmentedButtons
    if (!segmentedButtons) {
      segmentedButtons = document.createElement('segmented-buttons')
      segmentedButtons.setAttribute('lockable', '')
      segmentedButtons.setAttribute('required', '')
      this.root.appendChild(segmentedButtons)
    }
    segmentedButtons.innerHTML = gLanguages.peek().map(lang =>
      `<div slot='option' data-value="${lang}">${lang}</div>`
    ).join('')
    return {segmentedButtons}
  })
  .wPostMountFn(function () {
    gLanguages.onChange(this.rerender)
  })
  .bwild();


export default LocaleSelector;