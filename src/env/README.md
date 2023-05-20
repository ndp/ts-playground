No-nonsense help with ENVironmental variable processing for your Typescript project.


[Accessing environment variables](https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_env)  within a node app is straightforward, 
but as an app ages and grows, small problems crop up. This is a small
solution to those small problems.

## Problems:

- When setting up a project in a new environment, things break. It can be obvious, or it can be an exception that is thrown after the app has been running some time. It can be a bit of a treasure hunt to find and fix these.
- When you start working on a project, incomplete or outdated documentation may mean it's hard to get a project working.
- When an environment variable is used in multiple parts of the code, it may be used inconsistently. Maintaining and updating default values may be error prone.

## Features:

- detect missing configurations in one place
- provide documentation about what is expected
- provide config defaults for optional variables
- coerce to specific (Typescript) type

## Usage

### `configure`
This package replaces the normal uses of `process.env` with an alternative. To create it, call `configure` providing metadata about each of the expected variables. This is done with an object, where the keys are the variable names, and the metadata attributes are:
- `description` (required): a textual description of the variable
- `type` (default "string"): `string`, `boolean` or `integer`
- `required`: `true` or `false`
- `default`: a default value, if the variable is not required

Here is an example:
```ts
import {configure} from "ts-envs";

const envs = configure({
  hostname: {
    description: 'Hostname to be reflected in logs',
    required:     false,
    default:     'www.example.com'
  },
  db_url: {
    description: 'A connection to the database, eg. sqlite3://localhost:3495',
    required:     true,
  },
  port: {
    type:        'integer',
    description: 'Port to listen for HTTP requests',
    required:     true
  },
  verbose: {
    type:        'boolean',
    description: 'Log more stuff',
    required:     false,
    default:      false
  }
})
```

### Access
Access the variables works like `process.env`:

```ts
const hostName: string  = envs.hostname
const dbUrl:    string  = envs.db_url
const port:     number  = envs.port
const verbose:  boolean = envs.verbose
```
There are a few improvements to `process.env`:
- In Typescript, variables are of the specified type
- Variable name are automatically converted to uppercase before extraction from `process.env`. Javascript code does not have to have upper-cased strings uglifying the code (although you are free to use uppercase if you prefer that). 
- If the variable is optional and not present in the environment, the default value will be returned
- If the variable is missing or of the wrong type, an exception will be thrown

The `envs` object also has additional features:

### `verifyEnvironment(): boolean`

It's valuable to verify that all the configured variables are present early on when running a script, so the app doesn't fail deep inside. (And this is _not_ done automatically when you configure the variables.) This method returns `true` if the all the variables are set, and false if not. Usage:
```ts
if (!envs.verifyEnvironment())
  process.exit(1)
```
As a side effect, it outputs to the `console` an easy-to-understand error message (if necessary):
```
Environmental variable errors!
Missing environment variable "DB_URL"
Description: A connection to the database, eg. sqlite3://localhost:3495

Missing environment variable "PORT"
Description: Port to listen for HTTP requests
...
```
This output is followed by a complete "help text" (below) that describes all the variables.

### `envs.helpText: string`

`envs.helpText` describes all of the variables, based on the configuration. This is used for the error message above, but you might want to include it in other help information or documentation. It looks like:

    E N V I R O N M E N T   V A R I A B L E S
    
    Required environment variables:
    DB_URL        A connection to the database, eg. sqlite3://localhost:3495
    PORT          Port to listen for HTTP requests
    
    Optional environment variables [default value]:
    HOSTNAME      Hostname to be reflected in logs ["www.example.com"]

### `env.errors: Array<string>`

`env.errors` is an array of strings of the errors. This is accessed automatically in `verifyEnvironment` above, but they are made available for any other usage.

## Non-features:
- Creating some hierarchy out of your environment variables, based on their names.
- Allow you to create aliases of environment variables.
- Parsing apart complex values within environment variables.
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

## TODO

- boolean values
- enums (?)

## NOTES

- Created package using https://medium.com/cameron-nokes/the-30-second-guide-to-publishing-a-typescript-package-to-npm-89d93ff7bccd
