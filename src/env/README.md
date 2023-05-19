No-nonsense help with ENVironmental variable processing for your Typescript project.
[Accessing environmental variables](https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_env)  within a node app is straightforward, 
but as an app ages and grows, small problems crop up. This is a small
solution to those small problems.

## Problems:

- When setting up a project in a new environment, things break. It can be obvious, or it can be an exception that is thrown after some time. It can be a bit of a treasure hunt to find and fix these.
- When you start working on a project, incomplete or outdated documentation may mean it's hard to get a project working.
- When an environmental variable is used in multiple parts of the code, it may be used inconsistently. Maintaining and updating default values may be error prone.

## Features:

- detect missing configurations in one place
- provide documentation about what is expected
- provide config defaults for optional variables
- coerce to specific (Typescript) type

## Usage

This is done by providing a configuration of the allowed variables. This returns an object that is an alternate to `process.env`. With it you can access environmental variables coerced to their proper types, validate that all required variables were configured, and output a help text with descriptions of all the variables.

```ts
import {configure} from "./env";

const envs = configure({
  hostname: {
    description: 'by default, environment variables are strings',
    required: false,
    default: 'jj'
  },
  db_url: {
    // type: 'string', // the default
    description: 'required variables cannot have a default value',
    required: true,
    // default: 'sqlite3://localhost:3495'
    // required variables have no default values
  },
  port: {
    type: 'integer',
    description: 'required integer',
    required: true
  },
  threads: {
    type: 'integer',
    description: 'optional integer, has a default',
    required: false,
    default: 8
  },

  cache_url: {
    type: 'string',
    description: 'type of string can be specified explicitly',
    required: false,
    default: 'memcached://localhost:1234'
  },
  permissions: {
    type: 'json',
    description: 'JSON configs are just strings (for now)',
    required: true
  }
})


// Entries come out as the right type!
const a1: string = envs.cache_url
const a2: string = envs.db_url
const a3: number = envs.port
const a4: string = envs.hostname
const a5: number = envs.threads

```
## Non-features:
- Creating some hierarchy out of your environmental variables, based on their names.
- Allow you to create aliases of environmental variables.
- Parsing apart complex values within environmental variables.
- Reading alternate `.env` files.
- Use some third-party schema definitions. (Typescript only!)

## Similar Projects

- https://www.npmjs.com/package/znv: Parses using zod types. 
- https://www.npmjs.com/package/env-var: Verification, sanitization, and type coercion for environment variables in Node.js and web applications. Supports TypeScript!
- https://www.npmjs.com/package/@sadams/environment: Similar, with custom parsers.
- https://www.npmjs.com/package/chickenv: Detects missing variables
- https://www.npmjs.com/package/common-env: Lots of options. Aliases.
- https://www.npmjs.com/package/@trenskow/config: Infers a hierarchy, and has a little bit of validation
- https://www.npmjs.com/package/castenv: Casts process.env variables directly, based on heuristics
- https://www.npmjs.com/package/@tonbul/env-parser: explicit conversion functions
- https://www.npmjs.com/package/getenv2: Uses joi for types, and also defaults per environment
- https://www.npmjs.com/package/strict-env-conf: Similar motivation; builds hierarchy of values
- https://www.npmjs.com/package/safe-env-vars: Verification on `get`.

TODO
- boolean values
- enums (?)

