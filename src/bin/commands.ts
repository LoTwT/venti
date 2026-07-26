import { parseArgs } from "node:util"

import type { ArgType } from "citty"
import { defineCommand, showUsage } from "citty"

import { cloneAction, envAction, upgradeAction } from "@/utils"
import pkgJson from "~/package.json"

export const envCommand = defineCommand({
  meta: {
    name: "env",
    description: "environment variables",
  },
  run() {
    return envAction()
  },
})

// options are derived from the command's args so this strict pre-parse stays
// in sync with the real arg definitions (citty itself parses leniently)
export function validateCommandArgs(
  cmd: { args?: unknown },
  rawArgs: string[],
) {
  const argsDef = cmd.args as Record<
    string,
    { type?: ArgType; alias?: string | string[] }
  >
  const options: Record<
    string,
    { type: "string" | "boolean"; short?: string }
  > = {}
  let maxPositionals = 0

  for (const [name, def] of Object.entries(argsDef)) {
    if (def.type === "positional") {
      maxPositionals += 1
      continue
    }
    const option = {
      type: def.type === "boolean" ? ("boolean" as const) : ("string" as const),
    }
    options[name] = option
    // citty auto-aliases camelCase args to kebab-case flags, so the strict
    // pre-parse must accept the kebab form as well (--dryRun / --dry-run)
    const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    if (kebab !== name) options[kebab] = option
    const [short] = [def.alias ?? []].flat()
    if (short) options[name].short = short
  }

  const { positionals } = parseArgs({
    args: rawArgs,
    options,
    allowPositionals: true,
    strict: true,
  })

  if (positionals.length > maxPositionals) {
    throw new TypeError(
      `Unexpected positional argument: ${positionals[maxPositionals]}`,
    )
  }
}

export function validateCloneArgs(rawArgs: string[]) {
  validateCommandArgs(cloneCommand, rawArgs)
}

export function validateUpgradeArgs(rawArgs: string[]) {
  validateCommandArgs(upgradeCommand, rawArgs)
}

export const cloneCommand = defineCommand({
  meta: {
    name: "clone",
    description: "wrapper of git clone",
  },
  args: {
    repo: {
      type: "positional",
      description: "repository in user/repo format",
      required: true,
    },
    dirname: {
      type: "positional",
      description: "target directory name",
      required: false,
    },
    platform: {
      type: "enum",
      description: "github or gitlab",
      options: ["github", "gitlab"],
      alias: "p",
    },
    clean: {
      type: "boolean",
      description: "clean clone without .git",
      alias: "c",
    },
  },
  run({ args }) {
    return cloneAction(args.repo, args.dirname, {
      platform: args.platform,
      clean: args.clean,
    })
  },
})

export const upgradeCommand = defineCommand({
  meta: {
    name: "upgrade",
    description: "run tool upgrades",
  },
  args: {
    names: {
      type: "positional",
      description: "comma-separated tool names (e.g. brew,rust)",
      required: false,
    },
    all: {
      type: "boolean",
      description: "upgrade all known tools",
    },
    yes: {
      type: "boolean",
      description: "run without confirmation",
      alias: "y",
    },
    dryRun: {
      type: "boolean",
      description: "print the commands without running them",
    },
    json: {
      type: "boolean",
      description: "machine-readable JSON output",
    },
  },
  run({ args }) {
    return upgradeAction({
      names: args.names,
      all: args.all,
      yes: args.yes,
      dryRun: args.dryRun,
      json: args.json,
    })
  },
})

export const mainCommand = defineCommand({
  meta: {
    name: "venti",
    version: pkgJson.version,
    description: pkgJson.description,
  },
  subCommands: {
    env: envCommand,
    clone: cloneCommand,
    upgrade: upgradeCommand,
  },
  // citty runs the parent's `run` even after dispatching to a subcommand,
  // so only show usage when no subcommand was given
  run({ cmd, rawArgs }) {
    if (rawArgs.length === 0) return showUsage(cmd)
  },
})
