export async function maybeFetchText(url: URL) {
    try {
        const res = await fetch(url.href);
        if (res.ok)
            return await res.text();
    } catch (e) {
        // ignore and return empty
    }
    return '';
}

export type IsEmptyObject<Obj extends Record<PropertyKey, unknown>> =
  [keyof Obj] extends [never] ? true : false;
