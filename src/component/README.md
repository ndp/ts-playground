# @ndpsoftware/component-bwilder

Typed, minimal helpers for building compact Web Components used in this repository.

This package exposes a small, TypeScript-first API for defining custom elements with an explicit render lifecycle, simple sub-element wiring, and optional adopted/inline CSS handling.

## Why this exists

- Focus: small APIs and tight TypeScript ergonomics for library/internal components.
- Predictability: explicit `render`, `postRender` and `postMount` lifecycle hooks.
- Convenience: fluent builder (`ComponentBwilder`) to declare attributes, sub-elements and rendering logic
  to create type-safe components with minimal boilerplate.
- Guiding principles:
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

## Quick example

```ts
import { ComponentBwilder } from './componentBwilder'

new ComponentBwilder()
	.wTagName('x-greeting')
	.wShadowDOM('open')
	.wCSS(':host{display:block;padding:4px;}')
	.wObservedAttr('name')
	.wElement('label')
	.wRender(function() {
		this.root.innerHTML = `<div><span>${this.name ?? 'world'}</span></div>`
		return { label: 'span' }
	})
	.build()
```

See the implementation for full types and helpers.

## Main exports

- `ComponentBwilder` — fluent builder for declaring a component class and registering a tag.
- `makeComponentRendererFromFn`, `makeComponentRendererFromString` — small renderer helpers.
- `assertValidTagName`, `isValidTagName` — validate custom element names.
- Types: `ComponentRenderer`, `RenderContext`, `SubElementsMap`, and related types to strongly type render functions.

## Files of interest

- Implementation: [./componentBwilder.ts](./componentBwilder.ts)
- Public exports: [./index.ts](./index.ts)
- Tests and examples: [./*-test.ts](.)

## Build & test

From `src/component` package directory:

```bash
npm run build                  # build JS + types
npm run test                   # run tests (node --test + jsdom)
npm run typecheck              # run TypeScript checks
```

## Alternatives / inspiration

- Hybrids: https://hybrids.js.org/ — similar philosophy for small components
- Lit: https://lit.dev/ 