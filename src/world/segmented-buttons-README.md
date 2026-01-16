# segmented-buttons

A concise guide for using the `segmented-buttons` Web Component: goals, configuration, API, customization, and examples.

## What it is
A lightweight Material-like segmented control implemented as a custom element `segmented-buttons`.  
Options are plain slottable elements (buttons, divs, etc.) that declare `data-value` and are slotted into the component.

## Goals
- Offer a simple, themeable segmented control.
- Minimal JS surface: host attributes + CSS variables for visual configuration.
- Accessible enough for focus and pointer interaction; selection changes emit a `change` event.

## Quick install / load
Import the built module (adjust path for your bundle or dev server):

        <script type="module" src="/path/to/segmented-buttons.js"></script>

## Basic usage
Each option must:
- Have `slot="option"`.
- Have a `data-value` attribute.
Optionally have `disabled` or `selected` (initial selection).
The component will set `tabindex="0"` for options that don't already have it.

Example:

    <segmented-buttons id="seg1" style="--base-color: #00897b;">
      <button slot="option" data-value="apple">Apple</button>
      <button slot="option" data-value="banana" selected>Banana</button>
      <button slot="option" data-value="cherry">Cherry</button>
    </segmented-buttons>

## Host attributes
- *size* — controls padding/font-size. Values: small, (default), large.
- *appearance* — visual style. Values: outline (outline-only), (default filled).
- *data-value* on the host will reflect the currently selected option's data-value.

## CSS variables (customize look)
- `--base-color` (required) — primary color controlling fills/tints.
- `--radius` — corner radius (default 8px).
- `--surface` — host background.
- `--outline` — divider/outline color.
- `--text` — default text color.
- `--font-size` — base font size.

Example:

    segmented-buttons {
      --base-color: #6200ee;
      --radius: 10px;
      --surface: #fff;
    }

## Events / API

`change` — dispatched on the host when selection changes. Bubbles. `event.detail` is `{ value: string | null }`.
`value` is `null` when selection is cleared.
Programmatic: read/write host `data-value` attribute to query or set state (setting programmatically may not toggle classes — prefer user interaction or extend the component).

Example:

    const seg = document.getElementById('seg1');
    seg.addEventListener('change', (e) => {
      console.log('selected', e.detail.value);
    });

## Initial selection and toggling

An option can be marked with selected in markup; the component will adopt this as the initial selection.
Clicking a selected option toggles it off (clears selection).

## Disabled

Add `disabled` to an option to prevent selection; styles and pointer events are applied automatically.
Accessibility notes
Options receive tabindex="0" automatically if omitted.
Focus styles are provided; keyboard interaction beyond tabbing (arrow keys) is not implemented by default.

## Development notes
Source files:
`src/world/segmented-buttons.ts` — component implementation.
`src/world/segmented-buttons.css` — component styles and CSS variables.
The component loads its stylesheet dynamically; ensure the built JS and CSS paths are correct for your bundler or server.

## Small gotchas
Elements must use `slot="option"` to be recognized.
`data-value` is required on option elements to participate.
The component sets and reads the host data-value attribute to represent selection.

## License / attribution
Component is small and intended for internal use; follow project licensing for distribution.