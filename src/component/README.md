# @ndp-software/component-bwilder

Typed, minimal helpers for building compact Web Components used in this repository.

This package exposes a small, TypeScript-first fluent API for defining custom elements with:
- an explicit, always-async render lifecycle (`render()`, `afterUpdate()`, `connected()`),
- observed vs. unobserved attributes,
- simple typed sub-element wiring,
- optional adopted (`CSSStyleSheet`) or inline CSS injection,
- slot / assigned-element wiring helpers with cleanup on disconnect.

## Overview
- **Purpose**: provide a lightweight, predictable, TypeScript-friendly workflow for declaring custom elements without a large framework.
- **Philosophy**: explicit, lifecycle hooks (`connectedFn`, `render()`, and `afterUpdate()`), minimal runtime, strong typing for attributes/sub-elements, and a fluent builder syntax.
- **Primary class**: `ComponentBwilder` — use its chained helpers (tag name, shadow DOM, CSS, attributes, sub-elements, render/lifecycle hooks) and call `.bwild()`
                      to return (and register) the strongly typed component class.

## Quick example
```ts
const Greeting = new ComponentBwilder()
  .wTagName('x-greeting')
  .wShadowDOM('open')
  .wCSS(':host{display:block;padding:4px;}')
  .wAttr('name')
  .wSubElement('label')
  .wRender(function () {
    this.root.innerHTML = `<div><span>${this['name'] ?? 'world'}</span></div>`
    return { label: 'span' }
  })
  .bwild()
```

## Feature highlights
- **Attribute access** (`.wAttr`): expose attribute values on the instance without observing changes.
- **Attribute rerendering** (`.wAttrRender`): rerender the component whenever the attribute changes.
- **Manual attribute binding** (`.wAttrBind`): update stable sub-elements without replacing the rendered DOM.
- **Parsed attributes**: deserialize DOM attribute strings into native values with inferred TypeScript types.
- **Sub-elements** (`.wSubElement` + selectors/elements returned from `render`): `this.subElements` holds strongly typed references after render completes.
- **CSS modes** (`.wCSS(cssText, mode?)`): defaults to `adopted` (shared `CSSStyleSheet`) with inline fallback, logging a single transition warning per component class when necessary.
- **Shadow DOM modes**: `.wShadowDOM('open'|'closed'|'none')` — when `'none'` rendering happens on the host element itself.
- **State management** (`.wState`): declare per-instance state with `.wState(name, initialValue)`. State values are accessible via `this.state[name]`. Assignments update the state object but do not automatically rerender; call `requestUpdate()` when the DOM should be refreshed. Initial values can be static or factory functions (called once per instance).
- **Lifecycle hooks**:
  - `.wRender(fn)` — called each time the component needs to update; always returns `Promise<void>`.
  - `.wAfterUpdateFn(fn)` — runs as a microtask after each render completes; supports `async` functions.
  - `.wConnectedFn(fn)` — runs once after the initial `connectedCallback` render + afterUpdate; supports async. Can return a cleanup function (sync or `Promise<() => void>`) that runs on disconnect.
- **Slot handling**: `.wSlotAddedHandler` gives you per-assigned-element callbacks that can return cleanup functions, called when elements are assigned or removed.

## Usage recipes

### 1. Observed vs unobserved attributes
```ts
new ComponentBwilder()
  .wTagName('c-observed')
  .wAttrRender('data-count')
  .wShadowDOM('none')
  .wRender(function () {
    this.root.innerHTML = `<div>Count: ${this['data-count'] ?? '0'}</div>`
  })
  .bwild()

new ComponentBwilder()
  .wTagName('c-unobserved')
  .wAttr('info', {ifMissing: 'default'})
  .wShadowDOM('none')
  .wRender(function () {
    this.root.innerHTML = `<div>Info: ${this['info']}</div>`
  })
  .bwild()

// Manually call `instance.render()` after attribute changes to refresh output.

new ComponentBwilder()
  .wTagName('c-bound')
  .wShadowDOM('none')
  .wSubElement('count')
  .wAttrBind('data-count', {
    initial: true,
    handler({newValue}) {
      this.subElements.count!.textContent = String(newValue ?? '0')
    }
  })
  .wRender(function () {
    this.root.innerHTML = '<span data-count></span>'
    return {count: '[data-count]'}
  })
  .bwild()
```

### Parsed attributes

All attribute declarations accept an options object. `parse` receives the DOM representation (`string | null`) and determines the instance property type. `ifMissing` is already that native type, so it is returned directly instead of being parsed. For `wAttrBind`, put the callback in `handler`; its `newValue` and `oldValue` are parsed before it runs.
```ts
const Counter = new ComponentBwilder()
  .wTagName('c-parsed-count')
  .wShadowDOM('none')
  .wAttrBind('data-count', {
    initial: true,
    ifMissing: 0,
    parse: raw => Number(raw),
    handler({newValue}) {
      const count: number = newValue
      this.root.textContent = String(count)
    }
  })
  .wRender(function () {
    this.root.innerHTML = '<output></output>'
  })
  .bwild()

const counter = new Counter()
counter['data-count'] // => 0
```

### 2. Sub-element wiring
```ts
new ComponentBwilder()
  .wTagName('c-subelems')
  .wSubElement('title')
  .wSubElement('content')
  .wShadowDOM('none')
  .wRender(function () {
    this.root.innerHTML = '<h1 id="title">Title</h1><div id="content">Body</div>'
    return { title: '#title', content: '#content' }
  })
  .wAfterUpdateFn(function ({ subElements }) {
    // `subElements.title` and `subElements.content` are populated
    subElements // OK
  })
  .bwild()
```

**Marking elements as required vs. optional** — Append `!` to a field name to mark it as required (non-null):
```ts
new ComponentBwilder()
  .wTagName('c-form')
  .wSubElement('email!')                    // Required: HTMLElement (no null check needed)
  .wSubElement('submit!', HTMLButtonElement) // Required & typed: HTMLButtonElement (no null)
  .wSubElement('status')                    // Optional: HTMLElement | null (needs null check)
  .wShadowDOM('none')
  .wRender(function () {
    this.root.innerHTML = `
      <input id="email" type="email" />
      <button id="submit">Submit</button>
      <div id="status"></div>
    `
    return { email: '#email', submit: '#submit', status: '#status' }
  })
  .wAfterUpdateFn(function () {
    // Required fields don't need null checks:
    this.subElements.email.innerHTML = ''    // ✓ no ?. needed
    this.subElements.submit.disabled = false  // ✓ no ?. needed

    // Optional field needs null check:
    if (this.subElements.status) {
      this.subElements.status.textContent = 'Ready'
    }
  })
  .bwild()
```

**Sub-element type hints** — pass a type parameter to `.wSubElement()` for type-safe property access:
```ts
new ComponentBwilder()
  .wTagName('c-form-typed')
  .wSubElement('email', HTMLInputElement)     // Typed as HTMLInputElement | null
  .wSubElement('submit', HTMLButtonElement)   // Typed as HTMLButtonElement | null
  .wSubElement('status')                      // Generic HTMLElement | null
  .wShadowDOM('none')
  .wRender(function () {
    this.root.innerHTML = `
      <input id="email" type="email" />
      <button id="submit">Submit</button>
      <div id="status"></div>
    `
    return { email: '#email', submit: '#submit', status: '#status' }
  })
  .wAfterUpdateFn(function () {
    // TypeScript knows the specific types:
    const emailValue = this.subElements.email?.value    // ✓ HTMLInputElement.value
    const isDisabled = this.subElements.submit?.disabled // ✓ HTMLButtonElement.disabled
    typeof emailValue === 'string' || typeof emailValue === 'undefined' // OK
  })
  .bwild()
```

The type parameter is optional and TypeScript-only (zero runtime cost). The bang suffix applies to all field types: `.wSubElement()`, `.wAttr()`, and `.wState()`.

### 3. CSS modes and sharing
```ts
new ComponentBwilder()
  .wTagName('c-css-adopted')
  .wCSS('.foo { color: red }')      // requests 'adopted', but falls back to inline if unsupported
  .wShadowDOM('none')
  .wRender(() => {})
  .bwild()

new ComponentBwilder()
  .wTagName('c-css-inline')
  .wCSS('.foo { color: red }', 'inline') // force inline <style> tags
  .wShadowDOM('none')
  .wRender(() => {})
  .bwild()
```

### 4. Async render / lifecycle hooks
```ts
const AsyncComponent = new ComponentBwilder()
  .wTagName('c-async')
  .wShadowDOM('none')
  .wRender(async function ({ root }) {
    // Simulate async fetch
    const data = { title: 'Test Data' }
    root.innerHTML = `<div>${data.title}</div>`
  })
  .wAfterUpdateFn(async function ({ root }) {
    // afterRenderHook equivalent
    root // OK
  })
  .wConnectedFn(async function () {
    // runs once after initial render + afterUpdate completes
    // Can return cleanup function for subscriptions, listeners, etc.
    return () => { /* teardown */ }
  })
  .bwild()

// connectedCallback() always returns Promise<void>, must await before reading DOM
const el = new AsyncComponent()
if (typeof el.connectedCallback === 'function') {
  await el.connectedCallback()
  // DOM is now ready to read
}
```

### 5. State management
```ts
new ComponentBwilder()
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
  .wAfterUpdateFn(function () {
    const btn = this.root.querySelector('button')
    if (btn) {
      btn.onclick = () => {
        this.state.count++
        void this.requestUpdate() // explicitly refreshes the DOM
      }
    }
  })
  .bwild()
```

State properties are plain, per-instance values: assigning to `this.state.propName` changes the state but does not automatically trigger rendering. Call `requestUpdate()` (or `render()`) to apply state changes to the DOM and run the normal update lifecycle. Initial values can be static primitives, objects, or factory functions (called once per instance to avoid sharing mutable defaults).

### 6. Type-preserved sub-elements with `ElementDescriptor`

When using render factories (`makeComponentRendererFromString`, `makeComponentRendererFromFn`) outside ComponentBwilder, you can also use `ElementDescriptor` to preserve specific element types:
```ts
// This test demonstrates the ElementDescriptor pattern
// In real code, you would use: makeComponentRendererFromString()
const descriptor: Record<string, string | ElementDescriptor> = {
  email: { selector: '#email', type: HTMLInputElement },
  submit: { selector: '#submit', type: HTMLButtonElement }
}
```

Or mix string selectors (generic HTMLElement) with typed descriptors:
```ts
const descriptor: Record<string, string | ElementDescriptor> = {
  email: { selector: '#email', type: HTMLInputElement },  // Typed
  status: '#status'                                       // Generic HTMLElement | null
}
```

The `type` property in `ElementDescriptor` is optional and TypeScript-only (zero runtime cost).

### 7. Slot assigned-element handling
```ts
new ComponentBwilder()
  .wTagName('c-slot-demo')
  .wShadowDOM('open')
  .wRender(function ({ root }) {
    root.innerHTML = '<slot></slot>'
  })
  .wSlotAddedHandler(function (_, assignedEl) {
    // Called for each assigned element; slot handler does NOT fire during
    // connectedCallback until AFTER connectedFn (if present) completes.
    const onClick = () => { /* handle click */ }
    assignedEl.addEventListener('click', onClick)
    return () => assignedEl.removeEventListener('click', onClick)
  })
  .bwild()
```

The handler fires immediately when elements are dynamically assigned to slots after mount, and the returned cleanup function is called when:
- Elements are unassigned from the slot.
- The component is disconnected.

## Generated tag names

Use `ComponentBwilder.generateUniqueTagName(prefix?)` when a component needs a registered tag name but a fixed name would risk collisions:

```ts
const tagName = ComponentBwilder.generateUniqueTagName('dashboard-widget')
const DashboardWidget = new ComponentBwilder()
  .wTagName(tagName)
  .wRender(function () {
    this.root.innerHTML = '<p>Dashboard</p>'
  })
  .bwild()

document.body.append(document.createElement(tagName))
```

This is useful for plugin-provided components, embedded widgets, dynamically loaded component variants, demos, and tests that need isolated registrations. The generated name is checked against the current `customElements` registry, so it avoids collisions with components already registered in the page.

Generated names are only unique within the current runtime. Do not use them for server-rendered or persisted markup, CSS selectors that must remain stable, URLs, or APIs shared across page loads. Use an explicit `.wTagName('my-widget')` in those cases. Use `.wTagName(null)` when registration is not needed.

## API quick reference

### Builder methods (chainable)
- `ComponentBwilder.generateUniqueTagName(prefix?)` — generate a valid, currently unused custom-element tag name
- `wTagName(tag: string | null)` — custom element tag name (or null to skip registration)
- `wShadowDOM(mode: 'open' | 'closed' | 'none')` — shadow DOM mode
- `wCSS(cssText: string, mode?: 'adopted' | 'inline')` — inject CSS
- `wAttr(name, {parse?, ifMissing?})` — expose an attribute value without observing changes. Parsed values have the inferred return type of `parse`; `ifMissing` uses that same native type. Append `!` to name to mark as required.
- `wAttrRender(name, {parse?, ifMissing?})` — rerender when the attribute changes. Parsed values have the inferred return type of `parse`; `ifMissing` uses that same native type. Append `!` to name to mark as required.
- `wAttrBind(name, {handler, parse?, ifMissing?, initial?})` — invoke `handler` when the attribute changes. `parse` parses `oldValue` and `newValue`; use `initial: true` to invoke the handler after the initial render as well.
- `wSubElement(name: string, elementType?: ElementConstructor)` — declare a sub-element. Append `!` to name to mark required (e.g., `'email!'` → non-null, no null-check needed). Pass an HTMLElement constructor as second parameter for type-safe property access.
- `wState(name: string, initial: value | factory)` — declare per-instance state; assignments do not automatically render. Append `!` to name if the value can never be null/undefined.
- `wRender(fn)` — render function
- `wAfterUpdateFn(fn)` — runs after each render
- `wConnectedFn(fn)` — runs once after initial connection; can return cleanup
- `wSlotAddedHandler(fn)` — callback for assigned elements; can return cleanup
- `bwild()` — finalize and return the component class

### Instance properties & methods
- `this.root` — `ShadowRoot` (or `HTMLElement` if shadowDOM='none')
- `this.subElements` — typed map of sub-elements
- `this.state` — plain per-instance state object (properties accessible and settable; call `requestUpdate()` to render changes)
- `connectedCallback(): Promise<void>` — lifecycle hook (always returns Promise)
- `disconnectedCallback(): void` — lifecycle hook (runs cleanup)
- `render(): Promise<void>` — manual rerender (always returns Promise)
- `rerender(): Promise<void>` — alias for `render()`

## Notes & gotchas
- **Always-async lifecycle**: `connectedCallback()`, `render()`, and `rerender()` always return `Promise<void>`. Test code and production code that needs post-render DOM state must `await` these calls.
- **Slot handlers fire after connected**: Handlers registered with `.wSlotAddedHandler` do not fire for pre-assigned elements (elements slotted at connection time) until after `connectedFn` completes, preventing race conditions during mount.
- Use `.wAttrRender()` when an attribute change should replace the rendered structure. Use `.wAttrBind()` when the structure is stable and only named sub-elements need updating.
- **Cleanup on disconnect**: `connectedFn` can return a cleanup function (including an async cleanup) that runs when the component disconnects, allowing cleanup of subscriptions, listeners, or timers. `slotAddedHandler` cleanup also runs at this time. Cleanup failures are logged with component context, and remaining cleanup still runs.
- **Error handling**: Explicit `render()` and `requestUpdate()` calls reject when rendering, `afterUpdate`, or slot handlers fail. All slot handlers run before an aggregated failure is reported. Browser-triggered work (attribute changes and slot changes) catches failures and logs them with the component tag and lifecycle phase. `connectedCallback()` logs failures and resolves because the browser does not await its returned Promise.
- **Reconnection resets state**: Disconnecting and reconnecting a component resets `connectedComplete` flag and reruns the full lifecycle (render → afterUpdate → connected).
- `.wTagName(null)` returns the class without calling `customElements.define`, useful in test harnesses or subclassing scenarios.
- Use `ComponentBwilder.generateUniqueTagName('test-widget')` when a runtime-generated tag should be registered without colliding with existing components. Generated names are not stable across page loads.
- Adopted stylesheets require browser support ( `CSSStyleSheet`, `replaceSync()`); the builder logs a fallback warning and injects inline CSS otherwise.
- Attempting to define the same custom element tag twice throws (see tests).

## Future ideas

### Strict mode validation

Once you declare a field as required with `!` (e.g., `wSubElement('email!')`), it becomes part of your component's contract. The builder currently enforces this only at the TypeScript level. A future "strict mode" could add **runtime validation on component mount** to catch missing required fields early.

Example idea:
- When a component with required fields mounts, validate that all marked fields are actually present in the rendered output.
- Log or throw errors if a required field is missing, helping developers catch rendering bugs immediately rather than when code tries to access the field.
- Could be opt-in via `.wStrictMode(true)` or environment-based (dev only).
- Applies to required elements (`.wSubElement('x!')`), attributes (`.wAttr('role!')`), and state (`.wState('count!')`).

This would provide an additional layer of safety beyond TypeScript's compile-time guarantees, especially useful for complex or dynamically rendered components.

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
  normal JavaScript and Web Component patterns as much as possible.
