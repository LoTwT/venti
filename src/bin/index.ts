import { runMain } from "citty"

import {
  cloneCommand,
  mainCommand,
  upgradeCommand,
  validateCommandArgs,
} from "./commands"

const [command, ...commandArgs] = process.argv.slice(2)

const strictCommands = {
  clone: cloneCommand,
  upgrade: upgradeCommand,
} as const

const strictCommand = strictCommands[command as keyof typeof strictCommands]

if (
  strictCommand &&
  !commandArgs.includes("--help") &&
  !commandArgs.includes("-h")
) {
  try {
    validateCommandArgs(strictCommand, commandArgs)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

if (process.exitCode !== 1) await runMain(mainCommand)
