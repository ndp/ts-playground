// TypeScript
import {maybeFetchText} from './util.js'

class Timeline extends HTMLElement {
    private shadow: ShadowRoot;
    private container!: HTMLElement;
    private _locale: string = 'en-US';
    private timerId: number | null = null;
    static stylesheetPromise: Promise<string>;

    static get observedAttributes() {
        return ['locale'];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});
    }

    /*
    <div id="timeline">
  <div id="yesterday-time"></div>
    <div id="now-time">Long time</div>
  <div></div>
  <div id="tomorrow-time"></div>
  <div id="timeline-bar"></div>
  <div id="two-years-ago">Two Years Ago</div>
  <div id="seven-days-ago">Seven Days Ago</div>
  <div id="yesterday">Yesterday</div>
  <div id="seconds-ago">Seconds Ago</div>
  <div id="now">Now</div>
  <div id="in-minutes">In Minutes</div>
  <div id="tomorrow">Tomorrow</div>
  <div id="in-three-months">In Three Months</div>
  <div id="in-years">In Many Years</div>
</div>

     */

    async connectedCallback() {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(await Timeline.stylesheetPromise)
        this.shadow.adoptedStyleSheets = [sheet]

        this.container = document.createElement('div');
        this.container.className = 'timeline';
        this.container.innerHTML = `
        <div id="yesterday-time"></div>
        <div id="now-time"></div>
        <div id="tomorrow-time"></div>
        <div></div>
      
        <div id="timeline-bar"></div>
      
        <div id="two-years-ago"></div>
        <div id="seven-days-ago"></div>
        <div id="yesterday"></div>
        <div id="seconds-ago"></div>
        <div id="now"></div>
        <div id="in-minutes"></div>
        <div id="tomorrow"></div>
        <div id="in-three-months"></div>
        <div id="in-years"></div>
    `;

        this.shadow.appendChild(this.container);

        this.start()
    }

    disconnectedCallback() {
        this.stop();
    }

    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
        if (name === 'locale') {
            if (newVal)
                this.start();
            else this.stop()
        }
    }

    get locale(): string {
        return this.getAttribute('locale') || navigator.language || 'en-US';
    }

    private start() {
        this.updateAll();
        this.container.style.display = 'grid';
        if (!this.timerId)
            this.timerId = window.setInterval(() => this.updateAll(), 1000);
    }

    private stop() {
        this.container.style.display = 'none';
        if (this.timerId != null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    private updateAll() {
        if (!this.locale) return

        const now = new Date();

        // Relative times examples
        const rtf = new Intl.RelativeTimeFormat(this.locale, {numeric: 'auto'});
        this.setText('yesterday', rtf.format(-1, 'day'));
        this.setText('tomorrow', rtf.format(1, 'day'));
        this.setText('seven-days-ago', rtf.format(-7, 'day'));
        this.setText('seconds-ago', rtf.format(-30, 'second'));
        this.setText('in-minutes', rtf.format(5, 'minute'));
        this.setText('in-three-months', rtf.format(3, 'month'));
        this.setText('two-years-ago', rtf.format(-2, 'year'));
        this.setText('now', rtf.format(0, 'second'));
        this.setText('in-years', rtf.format(10, 'year'));

        // Date/time formatted examples
        this.setText('yesterday-time', new Date(now.getTime() - 24 * 3600 * 1000).toLocaleString(this._locale, {dateStyle: 'full'}));
        this.setText('now-time', now.toLocaleString(this._locale, {timeStyle: 'full'}));
        this.setText('tomorrow-time', new Date(now.getTime() + 24 * 3600 * 1000).toLocaleString(this._locale, {
            dateStyle: 'short',
            timeStyle: 'short'
        }));


    }

    private setText(id: string, text: string) {
        const el = this.shadow.getElementById(id);
        if (el) el.textContent = text;
    }
}

Timeline.stylesheetPromise = maybeFetchText(new URL('../../src/world/timeline.css', import.meta.url))

customElements.define('locale-timeline', Timeline);


