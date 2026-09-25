import { runMain } from "citty"

import {
  cloneCommand,
  doctorCommand,
  mainCommand,
  upgradeCommand,
  validateCommandArgs,
} from "./commands"

const [command, ...commandArgs] = process.argv.slice(2)

const strictCommands = {
  clone: cloneCommand,
  doctor: doctorCommand,
  upgrade: upgradeCommand,
} as const

const strictCommand = strictCommands[command as keyof typeof strictCommands]

try {
  if (
    command?.startsWith("-") &&
    !["--help", "-h", "--version", "-v"].includes(command)
  ) {
    throw new TypeError(`Options must follow a command: ${command}`)
  }

  if (
    strictCommand &&
    !commandArgs.includes("--help") &&
    !commandArgs.includes("-h")
  ) {
    validateCommandArgs(strictCommand, commandArgs)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}

if (process.exitCode !== 1) await runMain(mainCommand)
