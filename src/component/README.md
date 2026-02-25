# @ndp-software/component-bwilder

Typed, minimal helpers for building compact Web Components used in this repository.

This package exposes a small, TypeScript-first fluent API for defining custom elements with:
- an explicit render lifecycle (render, optional async post hooks),
- observed vs unobserved attributes,
- simple typed sub-element wiring,
- optional adopted (`CSSStyleSheet`) or inline CSS injection,
- slot / assigned-element wiring helpers.

## Overview
- **Purpose**: provide a lightweight, predictable, TypeScript-friendly workflow for declaring custom elements without a large framework.
- **Philosophy**: explicit lifecycle hooks (`render`, `postRender`, `postMount`), minimal runtime, strong typing for attributes/sub-elements, and a fluent builder syntax.
- **Primary class**: `ComponentBwilder` — use its chained helpers (tag name, shadow DOM, CSS, attributes, sub-elements, render/lifecycle hooks) and call `.bwild()` to return (and register) the strongly-typed component class.

## Quick example

```ts
import { ComponentBwilder } from './componentBwilder'

new ComponentBwilder()
.wTagName('x-greeting')
.wShadowDOM('open')
.wCSS(':host{display:block;padding:4px;}')
.wObservedAttr('name')
.wElement('label')
.wRender(function () {
this.root.innerHTML = `<div><span>${this['name'] ?? 'world'}</span></div>`
return { label: 'span' }
})
.bwild()
```

## Feature highlights
- **Observed attributes** (`.wObservedAttr`): automatic rerendering unless you provide an `onChange` callback (call `this.render()` manually inside the callback if you still need a DOM update).
- **Unobserved attributes** (`.wAttr`): expose attribute values on the instance without triggering renders.
- **Sub-elements** (`.wElement` + selectors/elements returned from `render`): `this.subElements` holds strongly typed references after render completes.
- **CSS modes** (`.wCSS(cssText, mode?)`): defaults to `adopted` (shared `CSSStyleSheet`) with inline fallback, logging a single transition warning per component class when necessary.
- **Shadow DOM modes**: `.wShadowDOM('open'|'closed'|'none')` — when `'none'` rendering happens on the host element itself.
- **Lifecycle hooks**: `.wPostRenderFn` runs after each render, `.wPostMountFn` runs once after the first render/postRender; both support async functions and are awaited by `render()`/`connectedCallback()`.
- **Slot handling**: `.wSlotAddedHandler` gives you per-assigned-element callbacks that can return cleanup functions and are auto-invoked on disconnect.

## Usage recipes

### 1. Observed vs unobserved attributes
```ts
new ComponentBwilder()
.wTagName('c-observed')
.wObservedAttr('data-count')
.wShadowDOM('none')
.wRender(function () {
this.root.innerHTML = `<div>Count: ${this['data-count'] ?? '0'}</div>`
})
.bwild()
```

```ts
new ComponentBwilder()
.wTagName('c-unobserved')
.wAttr('info', 'default')
.wShadowDOM('none')
.wRender(function () {
this.root.innerHTML = `<div>Info: ${this['info']}</div>`
})
.bwild()
```
// Manually call `instance.render()` after attribute changes to refresh output.

### 2. Sub-element wiring
```ts
new ComponentBwilder()
.wTagName('c-subelems')
.wElement('title')
.wElement('content')
.wShadowDOM('none')
.wRender(function () {
this.root.innerHTML = '<h1 id="title">Title</h1><div id="content">Body</div>'
return { title: '#title', content: '#content' }
})
.wPostRenderFn(function ({ subElements }) {
// `subElements.title` and `subElements.content` are populated
})
.bwild()
```

### 3. CSS modes and sharing
```ts
.wCSS('.foo { color: red }')      // requests adopted, falls back to inline if unsupported
.wCSS('.foo { color: red }', 'inline') // force inline <style> tags
```

### 4. Async render / lifecycle hooks
```ts
.wRender(async function ({ root }) {
const data = await fetchData()
root.innerHTML = `<div>${data.title}</div>`
})
.wPostRenderFn(async function ({ root }) {
await afterRenderHook()
})
.wPostMountFn(async function () {
// runs once after initial render + postRender completes
})
```

### 5. Slot assigned-element handling
```ts
.wRender(function ({ root }) {
root.innerHTML = '<slot></slot>'
})
.wSlotAddedHandler(function (_, assignedEl) {
assignedEl.addEventListener('click', onClick)
return () => assignedEl.removeEventListener('click', onClick)
})
```

## API quick reference
- `wTagName(tag: string | null)`
- `wShadowDOM(mode: 'open' | 'closed' | 'none')`
- `wCSS(cssText: string, mode?: 'adopted' | 'inline')`
- `wAttr(name: string, defaultValue?: string)`
- `wObservedAttr(name: string, onChange?: (args) => void)`
- `wElement(name: string)`
- `wRender(fn)`
- `wPostRenderFn(fn)`
- `wPostMountFn(fn)`
- `wSlotAddedHandler(fn)`
- `bwild()`


## Development
### Files of interest
- `./componentBwilder.ts` — implementation and types
- `./componentBwilder-test.ts` — behavioral coverage and examples
- `./index.ts` — public exports

### Testing & build
```bash
npm run build
npm run test
npm run typecheck
```

### Notes & gotchas
- Providing an `onChange` callback replaces the default rerender; call `this.render()` inside the callback when you still need to refresh DOM.
- `.wTagName(null)` returns the class without calling `customElements.define`, useful in test harnesses or subclassing scenarios.
- Adopted stylesheets require browser support ( `CSSStyleSheet`, `replaceSync()`); the builder logs a fallback warning and injects inline CSS otherwise.
- Attempting to define the same custom element tag twice throws (see tests).



## Guiding principles:
- Explicit is better than implicit: no magic lifecycle methods or auto-wiring.
- Type safety: strong typing for attributes, sub-elements, and render context.
- Minimalism: only the essential features for defining components, no extra abstractions.
- Flexibility: allow custom renderers and manual DOM manipulation when needed.
- Performance: avoid unnecessary re-renders and optimize for common patterns.
- Developer experience: clear APIs, good error messages, and helpful TypeScript types.
- Use the language. React subverts normal patterns: functions get called repeatedly,
  and perhaps mysteriously; variables don't work like variables, and you must use specific
  patterns to save state or plug into the lifecycle. This library attempt to stick to
  normal Javascript and Web Component patterns as much as possible.