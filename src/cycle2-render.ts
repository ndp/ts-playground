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

interface RenderContext {
  root: HTMLElement
}

/*
RenderFromString
================
Given a string of HTML, return a render state object that contains the elements
 */
type MapSubElementSelectors<SubElementKey extends string> = Record<SubElementKey, string>
type MapSubElements<SubElementKey extends string = string>
  = { [K in SubElementKey]: HTMLElement }

/**
 * A function that manually (or however) builds the component DOM
 * directly from the root element.
 *
 * Returns a map of subElements (if desired).
 */
export type ComponentRenderer<SubElsMap extends MapSubElements = {}>
  = (root: HTMLElement) => SubElsMap

/**
 * Given a map of subElements, return a render state object that contains the elements
 * @param root
 * @param subElements
 */
function mapSubElements<SubElementKey>(root: HTMLElement,
                                       subElements: MapSubElementSelectors<SubElementKey>) {
  const subEls = {} as MapSubElements<SubElementKey>
  for (const [k, v] of Object.entries(subElements)) {
    subEls[k] = root.querySelector(v)
  }
  return subEls;
}

function renderIntoRootFromString<SubElementKey extends string>(
  root: HTMLElement,
  html: string,
  subElements?: MapSubElementSelectors<SubElementKey>)
  : MapSubElements<SubElementKey> {

  // root is temp... should be part of the object
  root.innerHTML = html

  return subElements ? mapSubElements(root, subElements) : {}
}

export function makeStringBuilder<SubElementKey extends string>(
  html: string,
  subElements?: MapSubElementSelectors<SubElementKey>)
   {

  return (root: HTMLElement) => {
    root.innerHTML = html
    return subElements ? mapSubElements(root, subElements) : {}
  }
}

const root = document.createElement('div')

export const renderFromString= renderIntoRootFromString.bind(this, root)


// Library method to provide a function that renders manually.
export function buildDOM<SubElsMap extends MapSubElements>(
  renderFn: ComponentRenderer<SubElsMap>
): SubElsMap {

  // renderDOM from string
  // buildDOM from root
  return renderFn(root)
}
