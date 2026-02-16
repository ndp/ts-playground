

Alternatives:

https://hybrids.js.org/#/ -- this seems the closest in terms of philosophy and approach
https://lit.dev/ -- popular, but more focused on templates than state management


Validation:

- Run component tests (jsdom preload):

	`node --test -r ./test/setup-jsdom.js 'src/component/**/*test.ts'`

- Run component type check (declarations only):

	`tsc --declaration --emitDeclarationOnly --allowImportingTsExtensions --module nodenext --outDir ./build/ 'src/component/**/*.ts'`
