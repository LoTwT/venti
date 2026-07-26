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

### `venti clone <repo> [dirname]`

A wrapper of `git clone`.

- `<repo>` — repository in `user/repo` format, or a full https/ssh URL (passed through untouched)
- `[dirname]` — target directory name, defaults to the repository name
- `-p, --platform <github|gitlab>` — platform prefix for `user/repo` shorthand (default: `github`)
- `-c, --clean` — remove the `.git` directory after cloning
- `-d, --depth <depth>` — create a shallow clone with the given depth

```bash
venti clone LoTwT/venti
venti clone LoTwT/venti my-dir --clean --depth 1
venti clone https://github.com/LoTwT/venti.git
```

### `venti upgrade [names]`

Run tool upgrades for a known set of tools: `pnpm`, `brew`, `claude`, `kimi`, `rust`, `bun`. Tools that are not installed are skipped.

- `[names]` — comma-separated tool names, e.g. `brew,rust`
- `--all` — upgrade all known tools
- `-y, --yes` — run without confirmation (required for non-interactive runs)
- `--dry-run` — print the commands without running them
- `--json` — machine-readable JSON output

With no selection, an interactive multi-select prompt is shown in a TTY; in non-TTY contexts (or with `--json`) the available tools are listed instead.

```bash
venti upgrade                # interactive multi-select
venti upgrade brew,rust -y
venti upgrade --all --yes --json
venti upgrade --all --dry-run
```

### `venti doctor`

Check the local environment: Node.js version, git, the package manager declared in `package.json`, and the availability of the upgrade tools. Exits with code 1 when any check fails.

- `--json` — machine-readable JSON output

```bash
venti doctor
venti doctor --json
```

## License

[MIT](./LICENSE)
