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

import type { IsEmptyObject } from '../util/typescript.ts'

/*
The context object "this" passed to render functions.
Includes the root element and any attributes that are defined on the class
 */
export type RenderContext<Attrs extends {} = {}> = {
  root: HTMLElement
} & { [k in keyof Attrs]: Attrs[k] }

/*
A map of subElement names to CSS selectors to find them within the root element.
 */
export type SubElementSelectorsMap<K extends string = string>
  = { [k in K]: string }

/*
  A map of subElement names to the actual HTMLElement (or null if not found).
 */
export type SubElementsMap<K extends string = never>
  = { [k in K]: HTMLElement | null}

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
  html: string,
  subElements?: SelectorsMap) {

  const renderer = function (this: MyRenderContext) {
    this.root.innerHTML = html
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as RetVal
}

export function makeComponentRendererFromFn<
  SelectorsMap extends SubElementSelectorsMap,
  K = [keyof SelectorsMap][number],
  MyRenderContext extends RenderContext = RenderContext,
  RetVal = K extends string ? ComponentRenderer<MyRenderContext, SubElementsMap<K>> : ComponentRenderer>(
  htmlFn: (context: MyRenderContext) => string,
  subElements?: SelectorsMap) {

  const renderer = function (this: MyRenderContext) {
    this.root.innerHTML = htmlFn.call(this, this)
    return subElements ? mapSubElements(this.root, subElements) : null
  }
  return renderer as RetVal
}
