
type MetadataBase = {
    key: string
} 
interface StringMetadata extends MetadataBase  { 
    type: 'string' 
}

interface SQLString {
    type: 'string',
    maxLength?: number
    minLength?: number
}

type Metadata = MetadataBase & StringMetadata & SQLString

type Dictionary<Key extends string = string> = Record<Key, Metadata>

const entries = [
    { key: 'user.name', type: 'string' },
    { key: 'user.address', type: 'string' },
    { key: 'user.city', type: 'string' }
] as const

const dict = toDictionary(entries) 
console.log(dict)

function toDictionary<
M extends readonly Metadata[],
Ks extends string = M[number]['key']
>(
    metadatas: M
    ): Record<Ks, Metadata> {
    return toRecord(metadatas, 'key')
}


function toRecord<
  T extends { [K in keyof T]: string | number | symbol }, 
  K extends keyof T
>(array: readonly T[], selector: K): Record<T[K], T> {
  return array.reduce((acc, item) => (acc[item[selector]] = item, acc), {} as Record<T[K], T>)
}
