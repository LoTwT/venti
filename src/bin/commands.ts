import { parseArgs } from "node:util"

import type { ArgType } from "citty"
import { defineCommand, showUsage } from "citty"

import { addAction, cloneAction, envAction, shellAction } from "@/utils"
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

// options are derived from cloneCommand.args so this strict pre-parse stays
// in sync with the real arg definitions (citty itself parses leniently)
export function validateCloneArgs(rawArgs: string[]) {
  const argsDef = cloneCommand.args as Record<
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
    options[name] = { type: def.type === "boolean" ? "boolean" : "string" }
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

export const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "add dependencies",
  },
  run() {
    return addAction()
  },
})

export const shellCommand = defineCommand({
  meta: {
    name: "shell",
    description: "run shell update",
  },
  run() {
    return shellAction()
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
    add: addCommand,
    shell: shellCommand,
  },
  // citty runs the parent's `run` even after dispatching to a subcommand,
  // so only show usage when no subcommand was given
  run({ cmd, rawArgs }) {
    if (rawArgs.length === 0) return showUsage(cmd)
  },
})
