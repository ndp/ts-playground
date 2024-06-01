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

export interface BaseRenderContext {
  root: HTMLElement
}

export interface RenderContext extends BaseRenderContext {
}

/*
RenderFromString
================
Given a string of HTML, return a render state object that contains the elements
 */
export type SubElementSelectorsMap<K extends string>
  = { [k in K]: string }
export type SubElementsMap<K extends string = string>
  = { [k in K]: HTMLElement }

/**
 * A function that manually (or however) builds the component DOM
 * directly from the root element.
 *
 * Returns a map of subElements (if desired).
 */
export type ComponentRenderer<SubElsMap extends SubElementsMap = {}>
  = (this: RenderContext) => SubElsMap

/**
 * Given a map of subElements names to selectors, return a map of subElements.
 * @param root
 * @param subElements
 */
function mapSubElements<
  SelectorsMap = SubElementSelectorsMap<unknown>,
  Keys =  [keyof SelectorsMap][number],
  ElementsMap = SubElementsMap<Keys>
>(root: HTMLElement,
  subElements: SelectorsMap) {
  const subEls = {}
  for (const [k, v] of Object.entries(subElements)) {
    subEls[k] = root.querySelector(v as string)
  }
  return subEls as ElementsMap;
}

const foo = mapSubElements(myRoot, {div: 'div', span: 'span'})  // $ExpectType { div: HTMLElement; span: HTMLElement; }

function renderIntoRootFromString<SubElementKey extends string>(
  this: RenderContext,
  html: string,
  subElements?: SubElementSelectorsMap<SubElementKey>)
  : SubElementsMap<SubElementKey> {

  this.root.innerHTML = html

  return mapSubElements(this.root, subElements || {})
}

export const renderFromString = renderIntoRootFromString.bind({root: myRoot})


export function makeStringBuilder<
  SelectorsMap = SubElementSelectorsMap<unknown>,
  K =  [keyof SelectorsMap][number],
  RetVal = ComponentRenderer<SubElementsMap<K>>>(
  html: string | ((this: RenderContext) => string),
  subElements?: SelectorsMap) {

  const renderer = function (this: RenderContext) {
    this.root.innerHTML = typeof html === 'string' ? html : html.call(this)
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as RetVal
}

const myRoot = document.createElement('div')


export const buildDOM =
  function <SubElsMap extends SubElementsMap = {}>(
    this: RenderContext,
    renderer: ComponentRenderer<SubElsMap>) {
    const map = renderer.call(this) as SubElsMap
    return map
  }