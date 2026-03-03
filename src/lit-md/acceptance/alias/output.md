# Aliases

Use `alias` to register a short name for any shell command.
Alias calls do **not** appear in the documentation output —
they are invisible to the markdown renderer.
## Using an Alias

Once registered, the alias name works like any shell command.

```sh
greet "hello world"
# => hello world
```

## Aliases for Long Commands

Aliases are especially useful to shorten commands with flags or deep paths.
Relative paths in the command string are resolved to absolute paths
at registration time, so the alias works regardless of the shell working directory.

```sh
echo "quiet" | shout
# => QUIET
```
