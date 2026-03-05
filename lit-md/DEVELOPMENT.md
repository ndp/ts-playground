## Workflow

Before checking in changes, please run the tests and update snapshots and readme files as needed.

Use:

   > npm run verify

between all changes to confirm that all tests pass, code is valid typescript, and readme and snapshot files are up to date.

## Documentation

After any change, consider what documentation needs to be updated, looking in `./docs/README.md.test.ts`. Do NOT modify ./README.md directly; modify the ts file and run `npm run readme` to update the readme.

There is also a good set of acceptance tests in the acceptance folder. For larger changes add to this suite.
