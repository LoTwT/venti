import { runMain } from "citty"

import { mainCommand, validateCloneArgs } from "./commands"

const [command, ...commandArgs] = process.argv.slice(2)

if (
  command === "clone" &&
  !commandArgs.includes("--help") &&
  !commandArgs.includes("-h")
) {
  try {
    validateCloneArgs(commandArgs)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

if (process.exitCode !== 1) await runMain(mainCommand)
