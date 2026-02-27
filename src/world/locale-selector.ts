import {type ISO2CountryCode, teenyDb} from './teeny-db.ts';
import {RiggedQueue} from '@ndp-software/util';
import {ComponentBwilder, type TagName} from '@ndp-software/component-bwilder';

const LocaleSelector = (new ComponentBwilder())
  .wTagName('locale-selector' as TagName)
  .wShadowDOM('none')
  .wElement('segmentedButtons')
  .wState('languages', () => new RiggedQueue<string>(10, [navigator.language]))
  .wObservedAttr('data-country', function ({newValue}) {
    if (!newValue) return // Don't change if they don't send any value

    const countryLocales = teenyDb.langs(newValue as ISO2CountryCode);
    if (!countryLocales || countryLocales.length === 0) return // If we have no data, don't do anything

    const isLocked = this.subElements.segmentedButtons!.hasAttribute('locked')
    if (isLocked) {
      const lockedLocale = this.subElements.segmentedButtons!.getAttribute('data-locked')
      this.state.languages.use(lockedLocale!)
    }
    this.state.languages.add(...countryLocales)
    this.subElements.segmentedButtons!.setAttribute('suggested', countryLocales.join(','))

    if (countryLocales.length === 0 || isLocked) return

    this.subElements.segmentedButtons!.setAttribute('data-value', countryLocales[0])
    this.root.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value: countryLocales[0]}}))

  })
  .wRender(function () {
    let segmentedButtons = this.subElements.segmentedButtons
    if (!segmentedButtons) {
      segmentedButtons = document.createElement('segmented-buttons')
      segmentedButtons.setAttribute('lockable', '')
      segmentedButtons.setAttribute('required', '')
      this.root.appendChild(segmentedButtons)
    }
    segmentedButtons.innerHTML = this.state.languages.peek().map(lang =>
      `<div slot='option' data-value="${lang}">${lang}</div>`
    ).join('')
    return {segmentedButtons}
  })
  .wPostMountFn(function () {
    this.state.languages.onChange(this.rerender)
  })
  .bwild();


export default LocaleSelector;