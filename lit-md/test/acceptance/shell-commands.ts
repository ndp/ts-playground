// # Shell Commands
//
// lit-md provides two ways to embed executable shell commands in documentation:
// the `shell` tagged template and the `shellExample` structured function.
// Both run the command as a test and emit a `sh` code block.

import { shell } from '../../src/index.ts'

// ## shell Tagged Template
//
// Use `` shell`command` `` to run a command and verify it exits successfully.

shell`echo "hello world"`

// ### Asserting stdout
//
// Add `# => text` to assert that stdout contains a substring.

shell`echo "ready"
# => ready`

// ### Asserting file output
//
// Add `# file: path contains "text"` to assert that a file created by the
// command contains a given substring.

shell`echo "hello" > greeting.txt
# file: greeting.txt contains "hello"`

// ## Multiple Commands
//
// Multiple commands in one template run in sequence and render as a single `sh` block.

shell`echo "first"
echo "second"`