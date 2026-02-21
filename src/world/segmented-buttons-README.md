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
- *required* — when present, one option is always selected (see [Required](#required)).
- *multi* — allow multiple options to be selected; `data-value` becomes a comma-separated list.
- *data-value* on the host will reflect the currently selected option's data-value(s).

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

`change` — dispatched on the host when selection changes. Bubbles. `event.detail` is `{ value: string | string[] | null }`.
`value` is `null` when selection is cleared, a string in single-select mode, or an array in `multi` mode.
Programmatic: read/write host `data-value` attribute to query or set state (setting programmatically may not toggle classes — prefer user interaction or extend the component).

Example:

    const seg = document.getElementById('seg1');
    seg.addEventListener('change', (e) => {
      console.log('selected', e.detail.value);
    });

## Initial selection and toggling

An option can be marked with selected in markup; the component will adopt this as the initial selection.
Clicking a selected option toggles it off (clears selection).

## Required

Add the `required` attribute to the host to enforce that exactly one option is always selected:

    <segmented-buttons required style="--base-color: #00897b;">
      <button slot="option" data-value="day">Day</button>
      <button slot="option" data-value="week">Week</button>
      <button slot="option" data-value="month">Month</button>
    </segmented-buttons>

Behavior:
- If no option carries `selected` on mount, the first non-disabled option is auto-selected.
- Clicking the currently selected option does **not** deselect it (and no `change` event fires).
- Switching to another option works normally and fires a `change` event.
- If new slotted options are added at runtime and nothing is selected, the first non-disabled option is auto-selected.
- No `change` event is emitted for automatic enforcement selections — only for user-initiated switches.

Gotcha: `required` enforcement happens silently. If you programmatically remove the selected option without updating `data-value`, re-attaching any slot element will trigger re-enforcement.

## Multi-selection

Add the `multi` attribute to allow multiple options to be selected at once:

    <segmented-buttons multi>
      <button slot="option" data-value="grid" selected>Grid</button>
      <button slot="option" data-value="list">List</button>
      <button slot="option" data-value="table">Table</button>
    </segmented-buttons>

Behavior:
- `data-value` becomes a comma-separated list (e.g., `"grid,list"`).
- `change.detail.value` is an array of strings.
- Clicking a selected option toggles it off; when `required` is also present, the last remaining selection cannot be toggled off.
- Multiple options can be pre-marked with `selected` in markup and will be honored in multi mode.

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