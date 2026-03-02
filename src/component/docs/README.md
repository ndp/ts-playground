# @ndp-software/component-bwilder

Typed, minimal helpers for building compact Web Components used in this repository.

This package exposes a small, TypeScript-first fluent API for defining custom elements with:
- an explicit, always-async render lifecycle (`render()`, `afterUpdate()`, `connected()`),
- observed vs unobserved attributes,
- simple typed sub-element wiring,
- optional adopted (`CSSStyleSheet`) or inline CSS injection,
- slot / assigned-element wiring helpers with cleanup on disconnect.

## Overview
- **Purpose**: provide a lightweight, predictable, TypeScript-friendly workflow for declaring custom elements without a large framework.
- **Philosophy**: explicit, lifecycle hooks (`connectedFn`, `render()`, and `afterUpdate()`), minimal runtime, strong typing for attributes/sub-elements, and a fluent builder syntax.
- **Primary class**: `ComponentBwilder` — use its chained helpers (tag name, shadow DOM, CSS, attributes, sub-elements, render/lifecycle hooks) and call `.bwild()` to return (and register) the strongly-typed component class.
## Quick example
## Feature highlights
- **Observed attributes** (`.wObservedAttr`): automatic rerendering unless you provide an `onChange` callback (call `this.render()` manually inside the callback if you still need a DOM update).
- **Unobserved attributes** (`.wAttr`): expose attribute values on the instance without triggering renders.
- **Sub-elements** (`.wElement` + selectors/elements returned from `render`): `this.subElements` holds strongly typed references after render completes.
- **CSS modes** (`.wCSS(cssText, mode?)`): defaults to `adopted` (shared `CSSStyleSheet`) with inline fallback, logging a single transition warning per component class when necessary.
- **Shadow DOM modes**: `.wShadowDOM('open'|'closed'|'none')` — when `'none'` rendering happens on the host element itself.
- **State management** (`.wState`): declare reactive properties with `.wState(name, initialValue)`. State values are accessible via `this.state[name]`. Assigning to state properties automatically triggers a rerender. Initial values can be static or factory functions (called once per instance).
- **Lifecycle hooks**:
  - `.wRender(fn)` — called each time the component needs to update; always returns `Promise<void>`.
  - `.wAfterUpdateFn(fn)` — runs as a microtask after each render completes; supports `async` functions.
  - `.wConnectedFn(fn)` — runs once after the initial `connectedCallback` render + afterUpdate; supports async. Can return a cleanup function (sync or `Promise<() => void>`) that runs on disconnect.
- **Slot handling**: `.wSlotAddedHandler` gives you per-assigned-element callbacks that can return cleanup functions, called when elements are assigned or removed.
## Usage recipes
### 1. Observed vs unobserved attributes
### 2. Sub-element wiring
**Marking elements as required vs. optional** — Append `!` to a field name to mark it as required (non-null):
**Sub-element type hints** — pass a type parameter to `.wElement()` for type-safe property access:
The type parameter is optional and TypeScript-only (zero runtime cost). The bang suffix applies to all field types: `.wElement()`, `.wAttr()`, `.wObservedAttr()`, and `.wState()`.
### 3. CSS modes and sharing
### 4. Async render / lifecycle hooks
### 5. State management
State properties are reactive: assigning to `this.state.propName` automatically triggers a `render()` and `afterUpdateFn()` cycle. Initial values can be static primitives, objects, or factory functions (called once per instance to avoid sharing mutable defaults).
### 6. Type-preserved sub-elements with `ElementDescriptor`

When using render factories (`makeComponentRendererFromString`, `makeComponentRendererFromFn`) outside of ComponentBwilder, you can also use `ElementDescriptor` to preserve specific element types:
Or mix string selectors (generic HTMLElement) with typed descriptors:
The `type` property in `ElementDescriptor` is optional and TypeScript-only (zero runtime cost).
### 7. Slot assigned-element handling
The handler fires immediately when elements are dynamically assigned to slots after mount, and the returned cleanup function is called when:
- Elements are unassigned from the slot.
- The component is disconnected.
## API quick reference
### Builder methods (chainable)
- `wTagName(tag: string | null)` — custom element tag name (or null to skip registration)
- `wShadowDOM(mode: 'open' | 'closed' | 'none')` — shadow DOM mode
- `wCSS(cssText: string, mode?: 'adopted' | 'inline')` — inject CSS
- `wAttr(name: string, defaultValue?: string)` — unobserved attribute. Append `!` to name to mark as required (e.g., `'role!'` → always a string, never undefined).
- `wObservedAttr(name: string, onChange?: callback)` — observed attribute (auto-rerender unless onChange provided). Append `!` to mark as required.
- `wElement(name: string, elementType?: ElementConstructor)` — declare a sub-element. Append `!` to name to mark required (e.g., `'email!'` → non-null, no null-check needed). Pass an HTMLElement constructor as second parameter for type-safe property access.
- `wState(name: string, initial: value | factory)` — reactive state. Append `!` to name if the value can never be null/undefined.
- `wRender(fn)` — render function
- `wAfterUpdateFn(fn)` — runs after each render
- `wConnectedFn(fn)` — runs once after initial connection; can return cleanup
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
## Notes & gotchas
- **Always-async lifecycle**: `connectedCallback()`, `render()`, and `rerender()` always return `Promise<void>`. Test code and production code that needs post-render DOM state must `await` these calls.
- **Slot handlers fire after connected**: Handlers registered with `.wSlotAddedHandler` do not fire for pre-assigned elements (elements slotted at connection time) until after `connectedFn` completes, preventing race conditions during mount.
- **Providing an `onChange` callback** replaces the default rerender for observed attributes; call `this.render()` inside the callback when you still need to refresh DOM.
- **Cleanup on disconnect**: `connectedFn` can return a cleanup function that runs when the component disconnects, allowing cleanup of subscriptions, listeners, or timers. `slotAddedHandler` cleanup also runs at this time.
- **Reconnection resets state**: Disconnecting and reconnecting a component resets `connectedComplete` flag and reruns the full lifecycle (render → afterUpdate → connected).
- `.wTagName(null)` returns the class without calling `customElements.define`, useful in test harnesses or subclassing scenarios.
- Adopted stylesheets require browser support ( `CSSStyleSheet`, `replaceSync()`); the builder logs a fallback warning and injects inline CSS otherwise.
- Attempting to define the same custom element tag twice throws (see tests).
## Future ideas
### Strict mode validation

Once you declare a field as required with `!` (e.g., `wElement('email!')`), it becomes part of your component's contract. The builder currently enforces this only at the TypeScript level. A future "strict mode" could add **runtime validation on component mount** to catch missing required fields early.

Example idea:
- When a component with required fields mounts, validate that all marked fields are actually present in the rendered output.
- Log or throw errors if a required field is missing, helping developers catch rendering bugs immediately rather than when code tries to access the field.
- Could be opt-in via `.wStrictMode(true)` or environment-based (dev only).
- Applies to required elements (`.wElement('x!')`), attributes (`.wAttr('role!')`), and state (`.wState('count!')`).

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
  normal Javascript and Web Component patterns as much as possible.
