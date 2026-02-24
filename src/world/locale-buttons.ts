// src/world/locale-buttons.ts
import {type ISO2CountryCode, teenyDb} from './teeny-db.ts';
import {RiggedQueue} from '@ndp-software/util';
import {ComponentBwilder, type TagName} from '@ndp-software/component-bwilder';

const gLanguages = new RiggedQueue<string>(10, ['en', navigator.language]);


const LocaleChooser = (new ComponentBwilder())
  .wTagName('locale-buttons' as TagName)
  .wShadowDOM('none')
  .wObservedAttr('data-country', function (this: {root: HTMLElement}, {newValue}) {
    console.log('data-country changed: ', newValue)
    if (!newValue) return
    const newLocale = addCountryLocales(newValue as ISO2CountryCode);
    if (!newLocale) return
    this.root.querySelector('segmented-buttons')!.setAttribute('data-value', newLocale)
  })
  .wRender(function () {
    console.log('rendering locale buttons with  languages:', gLanguages.peek(), this)
    if (!this.root.querySelector('segmented-buttons'))
      this.root.innerHTML = '<segmented-buttons />'
    const buttons = this.root.firstChild as HTMLElement
    buttons.innerHTML = gLanguages.peek().map(lang =>
      `<div slot='option' data-value="${lang}">${lang}</div>`
    ).join('')
  })
  .wPostMountFn(function () {
    gLanguages.onChange(this.rerender)
  })
  .build();

function addCountryLocales(countryCode: ISO2CountryCode) {
  const countryLocales = teenyDb.langs(countryCode);
  console.log(` got country locales for ${countryCode}:`, countryLocales)
  if (!countryLocales) return
  gLanguages.add(...countryLocales)
  return countryLocales[0]
}


export default LocaleChooser;