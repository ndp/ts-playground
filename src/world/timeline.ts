import {maybeFetchText} from './util.js'
import {ComponentBwilder, type TagName} from '@ndp-software/component-bwilder'

const css = await maybeFetchText(new URL('../timeline.css', import.meta.url))

export default new ComponentBwilder()
  .wTagName('locale-timeline' as TagName)
  .wShadowDOM('open')
  .wCSS(css)
  .wAttr('locale', { onChange: true, ifMissing: navigator.language || 'en-US' })
  .wConnectedFn(function () {
    const timerId = setInterval(() => this.requestUpdate(), 1000)
    return () => clearInterval(timerId)
  })
  .wRender(function () {
    const locale = this['locale']
    const now = new Date()
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    this.root.innerHTML = `
      <div class="timeline">
        <div id="yesterday-time">${new Date(now.getTime() - 86400000).toLocaleString(locale, { dateStyle: 'full' })}</div>
        <div id="now-time">${now.toLocaleString(locale, { timeStyle: 'full' })}</div>
        <div id="tomorrow-time">${new Date(now.getTime() + 86400000).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}</div>
        <div></div>
        <div id="timeline-bar"></div>
        <div id="two-years-ago">${rtf.format(-2, 'year')}</div>
        <div id="seven-days-ago">${rtf.format(-7, 'day')}</div>
        <div id="yesterday">${rtf.format(-1, 'day')}</div>
        <div id="seconds-ago">${rtf.format(-30, 'second')}</div>
        <div id="now">${rtf.format(0, 'second')}</div>
        <div id="in-minutes">${rtf.format(5, 'minute')}</div>
        <div id="tomorrow">${rtf.format(1, 'day')}</div>
        <div id="in-three-months">${rtf.format(3, 'month')}</div>
        <div id="in-years">${rtf.format(10, 'year')}</div>
      </div>`
  })
  .bwild()
