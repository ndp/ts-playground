/*

DOM:

initial rendering:
renderDOM from string

subElements:
return selectors from root (subElements)
return subElements

updating:
none
full re-render from state (with renderDOM)
update subElements
rerender on specified events

 */

type IsEmptyObject<T extends {}> = keyof T extends never ? true : false

/*
Descriptor for an element with optional type information for type inference.
The 'type' property is optional and only used for TypeScript type narrowing.
 */
export interface ElementDescriptor<T extends HTMLElement = HTMLElement> {
  selector: string
  type?: new (...args: any[]) => T
}

/*
The context object "this" passed to render functions.
Includes the root element and any attributes that are defined on the class
 */
export type RenderContext<Attrs extends {} = {}, TSubElements extends SubElementsMap = {}, TState extends Record<string, unknown> = Record<string, unknown>> = {
  root: HTMLElement
  subElements: TSubElements
  state: TState
} & { [k in keyof Attrs]: Attrs[k] }

/*
A map of subElement names to CSS selectors or ElementDescriptors.
Supports both simple string selectors and descriptors with type information.
 */
export type SubElementSelectorsMap<K extends string = string>
  = { [k in K]: string | ElementDescriptor }

/*
Extracts the element type from a selector input.
- String selectors resolve to HTMLElement | null
- ElementDescriptor with type resolves to that specific type | null
- ElementDescriptor without type resolves to HTMLElement | null
 */
type ExtractElementType<T> = 
  T extends ElementDescriptor<infer E> ? E | null :
  T extends string ? HTMLElement | null :
  never

/*
A map of subElement names to the actual HTMLElement (or null if not found).
Preserves type information from the input selectors map.
 */
export type SubElementsMap<K extends string = never>
  = { [k in K]: HTMLElement | null }

/*
A map of subElement names to HTMLElement | null | string (for input to render functions).
Allows returning either elements, null, or CSS selectors from render functions.
 */
export type SubElementInputMap<K extends string = string>
  = { [k in K]: HTMLElement | null | string }

/**
 * A function that manually (or however) builds the component DOM
 * directly onto the root element.
 *
 * Returns a map of subElements (if desired).
 */
export type ComponentRenderer<
  TContext extends RenderContext = RenderContext,
  TSubElements extends SubElementsMap = {},
  TReturnData = IsEmptyObject<TSubElements> extends true ? void : TSubElements,
  TRetVal = TReturnData | Promise<TReturnData>>
  = (this: TContext, context: TContext) => TRetVal


/**
 * Given a map of subElements names to selectors (string or ElementDescriptor),
 * return a map of subElements with preserved type information.
 * @param root
 * @param selectorsMap
 */
function mapSubElements<SelectorsMap extends SubElementSelectorsMap>(
  root: HTMLElement,
  selectorsMap: SelectorsMap
): { [K in keyof SelectorsMap]: ExtractElementType<SelectorsMap[K]> } {
  const subEls: Record<string, HTMLElement | null> = {};
  for (const [k, v] of Object.entries(selectorsMap)) {
    const selector = typeof v === 'string' ? v : (v as ElementDescriptor).selector;
    subEls[k] = root.querySelector(selector)
  }
  return subEls as any;
}


export function makeComponentRendererFromString<SelectorsMap extends SubElementSelectorsMap>(
  html: string,
  subElements?: SelectorsMap) {

  const renderer = function (this: RenderContext) {
    this.root.innerHTML = html
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as unknown as SelectorsMap extends Record<string, any> 
    ? ComponentRenderer<RenderContext, { [K in keyof SelectorsMap]: ExtractElementType<SelectorsMap[K]> }>
    : ComponentRenderer
}

export function makeComponentRendererFromFn<SelectorsMap extends SubElementSelectorsMap>(
  htmlFn: (context: RenderContext) => string,
  subElements?: SelectorsMap) {

  const renderer = function (this: RenderContext) {
    this.root.innerHTML = htmlFn.call(this, this)
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as unknown as SelectorsMap extends Record<string, any>
    ? ComponentRenderer<RenderContext, { [K in keyof SelectorsMap]: ExtractElementType<SelectorsMap[K]> }>
    : ComponentRenderer
}
