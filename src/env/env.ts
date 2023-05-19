
type EnvMetaDescription = {
  description: string,
}
type EnvMetaDefaultStringBase = EnvMetaDescription
type EnvMetaStringBase = {
  type: 'string',
} & EnvMetaDescription
type EnvMetaIntegerBase = {
  type: 'integer',
} & EnvMetaDescription

type EnvMetadataBaseNoDefault = EnvMetaStringBase | EnvMetaIntegerBase
type EnvMetadataBase = EnvMetaDefaultStringBase | EnvMetadataBaseNoDefault

type EnvType<T extends EnvMetadataBase> =
  T extends { type: any }
    ? T['type'] extends 'integer'
      ? number
      : string
    : string

type RequiredMetadata<Metadata extends EnvMetadataBase> = Metadata & {
  required: true,
  default?: never
}

type OptionalMetadata<Metadata extends EnvMetadataBase> = Metadata & {
  required: false,
  default: EnvType<Metadata>
}

type EnvMetadata =
  RequiredMetadata<EnvMetaIntegerBase> |
  RequiredMetadata<EnvMetaDefaultStringBase> |
  RequiredMetadata<EnvMetaStringBase> |
  OptionalMetadata<EnvMetaIntegerBase> |
  OptionalMetadata<EnvMetaStringBase> |
  OptionalMetadata<EnvMetaDefaultStringBase>

type EnvsConfiguration = Record<string, EnvMetadata>

type EnvsFunctions = {
  verifyEnvironment: () => boolean,
  helpText: () => string,
  errors: () => Array<string> | false
}
type EnvsAccessor<T extends EnvsConfiguration> =
  {
    [P in keyof T]: EnvType<T[P]>
  } & EnvsFunctions

export function configure<T extends EnvsConfiguration>(configuration: T): EnvsAccessor<T> {
  const envsAccessor: Record<string, unknown> = {
    // helpText: () => helpText(configuration),
    // errors: () => checkEnvironmentalVariables(configuration),
    // verifyEnvironment: () => {
    //   const errors = checkEnvironmentalVariables(configuration)
    //
    //   if (errors.length === 0) return true
    //
    //   console.error('Environmental variable errors:')
    //   for (const e of errors)
    //     console.error(` -> ${e}`)
    //   console.log('')
    //   console.log(helpText(configuration))
    //   return false
    // }
  }

  Object.defineProperties(envsAccessor, {
    helpText: {
      get: () => helpText(configuration),
      enumerable: false
    },
    errors: {
      get: () => checkEnvironmentalVariables(configuration),
      enumerable: false
    },
    verifyEnvironment: {
      value: () => {
        const errors = checkEnvironmentalVariables(configuration)

        if (errors.length === 0) return true

        console.error('Environmental variable errors!')
        for (const e of errors)
          console.error(`${e}\n`)
        console.log('')
        console.log(helpText(configuration))
        return false
      },
      enumerable: false
    }
  })

  // Build an object that can be lazily evaluated
  Object.keys(configuration).forEach(k => {
    Object.defineProperty(envsAccessor, k, {
      get() {
        return readEnv(k, configuration[k])
      },
      enumerable: true
    })
  })

  return envsAccessor as EnvsAccessor<T>
}

export function helpText(configuration: EnvsConfiguration) {

  const requiredCount = Object.values(configuration).filter(e => e.required).length
  const optionalCount = Object.values(configuration).filter(e => !e.required).length
  const maxLength =
    Math.max(...Object.keys(configuration).map(jsKey2envName).map(s => s.length))

  let output = 'E N V I R O N M E N T   V A R I A B L E S\n\n'

  if (requiredCount > 0)
    output += 'Required environment variables:\n'
  for (const k in configuration) {
    if (!configuration[k].required) continue
    output += `${rpad(jsKey2envName(k), maxLength)}   ${configuration[k].description}\n`
  }

  if (requiredCount > 0 && optionalCount > 0)
    output += '\n'
  if (optionalCount > 0)
    output += 'Optional environment variables [default value]:\n'
  for (const k in configuration) {
    if (configuration[k].required) continue
    output += `${rpad(jsKey2envName(k), maxLength)}   ${configuration[k].description} ["${configuration[k].default}"]\n`
  }

  return output
}


export function checkEnvironmentalVariables(configuration: EnvsConfiguration) {

  const errors = [] as Array<string>

  Object.keys(configuration).forEach(k => {
    try {
      readEnv(k, configuration[k])
    } catch (e: unknown) {
      errors.push((e as Error).message)
    }
  })

  return errors
}

export function readEnv<T extends EnvMetadata>(jsKey: string, meta: T): EnvType<T> {

  const name = jsKey2envName(jsKey);

  const rawValue = process.env[name]

  const missing = rawValue === '' || rawValue === undefined;

  if (missing)
    if (!meta.required)
      return meta.default as EnvType<T>
    else
      throw Error(`Missing environment variable "${name}"\nDescription: ${meta.description}`)

  if ((meta as EnvMetadataBaseNoDefault).type !== 'integer')
    return rawValue as EnvType<T>

  const value = parseInt(rawValue)

  if (isNaN(value))
    throw Error(`Non-numeric environment variable "${name}" expected to be an integer.\nIt cannot be parsed using parseInt().\nDescription: ${meta.description}`)

  return value as EnvType<T>
}

function jsKey2envName(k: string) {
  return k.toLocaleUpperCase()
}

function rpad(s: string, len: number): string {
  return s.length < len ? rpad(s.toString() + ' ', len) : s;
}
