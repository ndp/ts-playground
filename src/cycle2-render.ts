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

export interface RenderContext {
  root: HTMLElement
}

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
  = { [k in K]: HTMLElement }

/**
 * A function that manually (or however) builds the component DOM
 * directly from the root element.
 *
 * Returns a map of subElements (if desired).
 */
export type ComponentRenderer<RetVal extends SubElementsMap = {}>
  = (this: RenderContext) => RetVal

/**
 * Given a map of subElements names to selectors, return a map of subElements.
 * @param root
 * @param subElements
 */
function mapSubElements<
  SelectorsMap extends Record<string, string>,
  Keys  = [keyof SelectorsMap][number],
  RetVal = Keys extends string ? SubElementsMap<Keys> : {}
>(root: HTMLElement,
  subElements: SelectorsMap) {
  const subEls: Record<string, HTMLElement | null> = {};
  for (const [k, v] of Object.entries(subElements)) {
    subEls[k] = root.querySelector(v as string)
  }
  return subEls as RetVal;
}


export function makeStringBuilder<
  SelectorsMap extends SubElementSelectorsMap,
  K =  [keyof SelectorsMap][number],
  RetVal = K extends string ? ComponentRenderer<SubElementsMap<K>> : ComponentRenderer>(
  html: string | ((this: RenderContext) => string),
  subElements?: SelectorsMap) {

  const renderer = function (this: RenderContext) {
    this.root.innerHTML = typeof html === 'string' ? html : html.call(this)
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as RetVal
}



  type BuildDOM<SubElsMap extends SubElementsMap = {}> = (
    renderer: ComponentRenderer<SubElsMap>) => SubElsMap;

export const buildDOM: BuildDOM =
  function (
    renderer) {
    return renderer.call({root: document.createElement('div')})
  }