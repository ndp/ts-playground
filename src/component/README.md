# @ndp-software/component-bwilder

Typed, minimal helpers for building compact Web Components used in this repository.

This package exposes a small, TypeScript-first fluent API for defining custom elements with:
- an explicit, always-async render lifecycle (`render()`, `postRender()`, `postMount()`),
- observed vs unobserved attributes,
- simple typed sub-element wiring,
- optional adopted (`CSSStyleSheet`) or inline CSS injection,
- slot / assigned-element wiring helpers with cleanup on disconnect.

## Overview
- **Purpose**: provide a lightweight, predictable, TypeScript-friendly workflow for declaring custom elements without a large framework.
- **Philosophy**: explicit, lifecycle hooks (`postMount`, `render()`, and `postRender()`), minimal runtime, strong typing for attributes/sub-elements, and a fluent builder syntax.
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
- **State management** (`.wState`): declare reactive properties with `.wState(name, initialValue)`. State values are accessible via `this.state[name]`. Assigning to state properties automatically triggers a rerender. Initial values can be static or factory functions (called once per instance).
- **Lifecycle hooks**: 
  - `.wRender(fn)` — called each time the component needs to update; always returns `Promise<void>`.
  - `.wPostRenderFn(fn)` — runs as a microtask after each render completes; supports `async` functions.
  - `.wPostMountFn(fn)` — runs once after the initial `connectedCallback` render + postRender; supports async. Can return a cleanup function (sync or `Promise<() => void>`) that runs on disconnect.
- **Slot handling**: `.wSlotAddedHandler` gives you per-assigned-element callbacks that can return cleanup functions, called when elements are assigned or removed.

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
const instance = new ComponentBwilder()
.wTagName('c-async')
.wShadowDOM('none')
.wRender(async function ({ root }) {
  const data = await fetchData()
  root.innerHTML = `<div>${data.title}</div>`
})
.wPostRenderFn(async function ({ root }) {
  await afterRenderHook()
})
.wPostMountFn(async function () {
  // runs once after initial render + postRender completes
  setupSubscriptions()
  return () => teardownSubscriptions() // cleanup on disconnect
})
.bwild()

// connectedCallback() always returns Promise<void>, must await before reading DOM
const el = new instance()
await el.connectedCallback()
// DOM is now ready to read
```

### 5. State management
```ts
const Counter = new ComponentBwilder()
  .wTagName('c-counter')
  .wShadowDOM('none')
  .wState('count', 0)
  .wState('items', () => []) // factory ensures unique instance
  .wRender(function () {
    this.root.innerHTML = `
      <div>Count: ${this.state.count}</div>
      <button>Increment</button>
    `
  })
  .wPostRenderFn(function () {
    const btn = this.root.querySelector('button')!
    btn.onclick = () => {
      this.state.count++  // triggers rerender
    }
  })
  .bwild()
```

State properties are reactive: assigning to `this.state.propName` automatically triggers a `render()` and `postRenderFn()` cycle. Initial values can be static primitives, objects, or factory functions (called once per instance to avoid sharing mutable defaults).

### 6. Slot assigned-element handling
```ts
.wRender(function ({ root }) {
  root.innerHTML = '<slot></slot>'
})
.wSlotAddedHandler(function (_, assignedEl) {
  // Called for each assigned element; slot handler does NOT fire during
  // connectedCallback until AFTER postMountFn (if present) completes.
  assignedEl.addEventListener('click', onClick)
  return () => assignedEl.removeEventListener('click', onClick)
})
```

The handler fires immediately when elements are dynamically assigned to slots after mount, and the returned cleanup function is called when:
- Elements are unassigned from the slot.
- The component is disconnected.

## API quick reference

### Builder methods (chainable)
- `wTagName(tag: string | null)` — custom element tag name (or null to skip registration)
- `wShadowDOM(mode: 'open' | 'closed' | 'none')` — shadow DOM mode
- `wCSS(cssText: string, mode?: 'adopted' | 'inline')` — inject CSS
- `wAttr(name: string, defaultValue?: string)` — unobserved attribute
- `wObservedAttr(name: string, onChange?: callback)` — observed attribute (auto-rerender unless onChange provided)
- `wElement(name: string)` — declare a sub-element (accessed via `this.subElements[name]`)
- `wState(name: string, initial: value | factory)` — reactive state (accessed via `this.state[name]`, assignment triggers rerender)
- `wRender(fn)` — render function
- `wPostRenderFn(fn)` — runs after each render
- `wPostMountFn(fn)` — runs once after initial connection; can return cleanup
- `wSlotAddedHandler(fn)` — callback for assigned elements; can return cleanup
- `bwild()` — finalize and return the component class

### Instance properties & methods
- `this.root` — `ShadowRoot` (or `HTMLElement` if shadowDOM='none')
- `this.subElements` — typed map of sub-elements
- `this.state` — reactive state object (properties accessible and settable)
- `connectedCallback(): Promise<void>` — lifecycle hook (always returns Promise)
- `disconnectedCallback(): void` — lifecycle hook (runs cleanup)
- `render(): Promise<void>` — manual rerender (always returns Promise)
- `rerender(): Promise<void>` — alias for `render()`


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
- **Always-async lifecycle**: `connectedCallback()`, `render()`, and `rerender()` always return `Promise<void>`. Test code and production code that needs post-render DOM state must `await` these calls.
- **Slot handlers fire after postMount**: Handlers registered with `.wSlotAddedHandler` do not fire for pre-assigned elements (elements slotted at connection time) until after `postMountFn` completes, preventing race conditions during mount.
- **Providing an `onChange` callback** replaces the default rerender for observed attributes; call `this.render()` inside the callback when you still need to refresh DOM.
- **Cleanup on disconnect**: `postMountFn` can return a cleanup function that runs when the component disconnects, allowing cleanup of subscriptions, listeners, or timers. `slotAddedHandler` cleanup also runs at this time.
- **Reconnection resets state**: Disconnecting and reconnecting a component resets `postMountComplete` flag and reruns the full lifecycle (render → postRender → postMount).
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
  patterns to save state or plug into the lifecycle. This library attempts to stick to
  normal Javascript and Web Component patterns as much as possible.