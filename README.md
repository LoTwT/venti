# venti

A personal CLI toolkit, designed for both interactive and non-interactive (agent/script) usage.

Requires Node.js >= 24.

## Install

```bash
npm install -g @ayingott/venti
```

## Usage

```bash
venti <command> [options]
```

Running `venti` with no command prints the usage.
Place command options after the command name. Only `--help`/`-h` and `--version`/`-v` are accepted before a command.

### `venti clone <repo> [dirname]`

A wrapper of `git clone`.

- `<repo>` — repository in `user/repo` format, or a full https/ssh URL (passed through untouched)
- `[dirname]` — relative or absolute target directory, defaults to the repository name; put a name beginning with `-` after `--`
- `-p, --platform <github|gitlab>` — platform prefix for `user/repo` shorthand (default: `github`)
- `-c, --clean` — remove the `.git` directory after cloning
- `-d, --depth <depth>` — create a shallow clone with the given depth

```bash
venti clone LoTwT/venti
venti clone LoTwT/venti my-dir --clean --depth 1
venti clone https://github.com/LoTwT/venti.git
venti clone ssh://git@github.com/LoTwT/venti.git
```

### `venti upgrade [names]`

Run tool upgrades for a known set of tools: `pnpm`, `brew`, `rust`, `bun`. Tools that are not installed are skipped.

- `[names]` — comma-separated tool names, e.g. `brew,rust`
- `--all` — upgrade all known tools
- `-y, --yes` — run without confirmation (required for non-interactive runs)
- `--dry-run` — print the commands without running them
- `--json` — machine-readable JSON output

With no selection, an interactive multi-select prompt is shown when both stdin and stdout are TTYs; otherwise (or with `--json`) the available tools are listed instead.

```bash
venti upgrade                # interactive multi-select
venti upgrade brew,rust -y
venti upgrade --all --yes --json
venti upgrade --all --dry-run
```

### `venti doctor`

Check the local environment: Node.js version, git, the package manager declared in `package.json`, and the availability of the upgrade tools. Exits with code 1 when any check fails.

Package manager declarations must use `npm`, `pnpm`, `yarn` or `bun` in `name@version` form. Invalid declarations or unreadable `package.json` files produce a failed check while preserving the other results.

- `--json` — machine-readable JSON output

```bash
venti doctor
venti doctor --json
```

## License

[MIT](./LICENSE)
