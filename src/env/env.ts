/*
Goals:
- detect missing configurations
- provide documentation about what is expected
- provide default configs
- coerce to specific type

 */

type EnvMetaDescription = {
  description: string,
}
type EnvMetaStringBase = {
  type?: 'string',
}
type EnvMetaIntegerBase = {
  type: 'integer',
}
type EnvMetaJSONBase = {
  type: 'json',
}
type EnvMetaTypeBase = EnvMetaStringBase | EnvMetaIntegerBase | EnvMetaJSONBase


// type TypeString = Required<EnvMetaTypeBase>['type']
type TypeString = EnvMetaTypeBase['type']

type StandardFields<T extends TypeString> = {
  type: T,
  description: string,
}

type RequiredEnvMetaData<T extends TypeString> = {
  required: true
} & StandardFields<T>

type OptionalEnvMetaData<T extends TypeString> = {
  required: false,
  default: T extends 'integer' ? number : string
} & StandardFields<T>
type EnvMetaOptionalOrRequired<T extends TypeString> = (RequiredEnvMetaData<T> |
  OptionalEnvMetaData<T>)

type EnvMeta =
  EnvMetaOptionalOrRequired<'string'>
  | EnvMetaOptionalOrRequired<'json'>
  | EnvMetaOptionalOrRequired<'integer'>

  type EnvsSpec = Record<string, EnvMeta>

const envs = setup({
  port: {
    type: 'integer',
    description: 'port to launch server on',
    required: true,
  },
  threads: {
    type: 'integer',
    description: 'port to launch server on',
    required: false,
    default: 8
  },
  hostname: {
    description: 'hostname used sometimes',
    required: false,
    default: 'jj'
  },
  db_url: {
    description: 'URL used to connect to the database',
    required: true,
    default: 'sqlite3://localhost:3495'
  },

  cache_url: {
    type: 'string',
    description: 'URL used to connect to the database',
    required: true,
    default: 'memcached://localhost:1234'
  }

})

const a1  = envs.cache_url
const a2  = envs.db_url
const a3  = envs.port
const a4  = envs.hostname
const a5  = envs.threads

type MapMetaToReturnType<T extends EnvMeta, Type = EnvMeta['type']> =
  T['type'] extends 'integer' ? number : string

type EnvsAccessor<T extends EnvsSpec> =
   {
  [P in keyof T]: MapMetaToReturnType<T[P]>
}

function setup<S extends EnvsSpec>(envsSpec: S): EnvsAccessor<S> {
  return {} as EnvsAccessor<S>
}
