/*

DOM:

initial rendering:
renderDOM from string
buildDOM from root

subElements:
return selectors from root (subElements)
return subElements

updating:
none
full re-render from state (with renderDOM)
update subElements
rerender on specified events

 */

export type RenderContext<Attrs extends {} = {}> = {
  root: HTMLElement
} & { [k in keyof Attrs]: Attrs[k] }

// export interface XRenderContext extends BaseRenderContext {
// }

/*
RenderFromString
================
Given a string of HTML, return a render state object that contains the elements
 */
export type SubElementSelectorsMap<K extends string = string>
  = { [k in K]: string }
export type SubElementsMap<K extends string = string>
  = { [k in K]: HTMLElement | null}

/**
 * A function that manually (or however) builds the component DOM
 * directly from the root element.
 *
 * Returns a map of subElements (if desired).
 */
export type ComponentRenderer<
  Context extends RenderContext = RenderContext<{}>,
  RetVal extends SubElementsMap = {}>
  = (this: Context) => RetVal

/**
 * Given a map of subElements names to selectors, return a map of subElements.
 * @param root
 * @param subElements
 */
function mapSubElements<
  SelectorsMap extends Record<string, string>,
  Keys = [keyof SelectorsMap][number],
  RetVal = Keys extends string ? SubElementsMap<Keys> : {}
>(root: HTMLElement,
  subElements: SelectorsMap) {
  const subEls: Record<string, HTMLElement | null> = {};
  for (const [k, v] of Object.entries(subElements)) {
    subEls[k] = root.querySelector(v as string)
  }
  return subEls as RetVal;
}


export function makeComponentRendererFromString<
  SelectorsMap extends SubElementSelectorsMap,
  K = [keyof SelectorsMap][number],
  MyRenderContext extends RenderContext = RenderContext,
  RetVal = K extends string ? ComponentRenderer<MyRenderContext, SubElementsMap<K>> : ComponentRenderer>(
  html: string | ((this: MyRenderContext) => string),
  subElements?: SelectorsMap) {

  const renderer = function (this: MyRenderContext) {
    this.root.innerHTML = typeof html === 'string' ? html : html.call(this)
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as RetVal
}

/**
 * Given a renderer, build the DOM and return the subElements.
 * @param renderer
 */
export const buildDOM =
  function<
    F extends ComponentRenderer<Context>,
    Context extends RenderContext = RenderContext<{}>
    > (
    this: Context,
    renderer: F): ReturnType<F> {
    return renderer.call(this) as ReturnType<F>
  }

  /*
  export type ComponentRenderer<
  Context extends RenderContext = RenderContext<{}>,
  RetVal extends SubElementsMap = {}>
  = (this: Context) => RetVal

   */