/**
 * - parameters alphabetized
 */
type URLParams = Record<string, string | true>
export function buildQueryString<Params extends URLParams>(
  params: Params = {} as Params
): string {
  return Object
    .keys(params)
    .sort()
    .map(k => `${k}${params[k] === true ? '' : `=${encodeURIComponent(params[k])}`}`)
    .join('&')
}
