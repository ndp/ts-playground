import { JSDOM } from 'jsdom';

const dom = new JSDOM();
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement