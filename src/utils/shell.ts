import { exit } from "node:process"
import { cancel, group, intro, multiselect, outro } from "@clack/prompts"
import chalk from "chalk"
import { execaCommand } from "execa"

const ShellCommands = {
  // pnpm: "pnpm i pnpm -g",
  "pnpm-update": "pnpm update -gL",
  brew: "brew upgrade",
  rust: "rustup update",
  bun: "bun upgrade",
}

export const shellAction = async () => {
  intro(
    `🍉 ${chalk.bold(
      `${chalk.cyanBright("Follow the wind")} and ${chalk.blueBright(
        "enjoy the day",
      )}!`,
    )} 🍉`,
  )

  const { commands } = await group<{ commands: symbol | string[] }>(
    {
      commands: () =>
        multiselect({
          message: "Select commands you want to run",
          options: Object.entries(ShellCommands).map(([key, value]) => ({
            value,
            label: key,
            hint: value,
          })),
          initialValues: Object.values(ShellCommands),
        }),
    },
    {
      onCancel: () => {
        cancel("❌ Operation Cancelled❗")
        exit(0)
      },
    },
  )

  if (commands.length === 0) {
    outro(`👋 Nothing to update! 👋`)
  } else {
    for (const command of commands) {
      intro()
      intro(`🚀 ${chalk.bold(chalk.greenBright(command))}`)
      await execaCommand(command, { encoding: "utf8", stdio: "inherit" })
      outro(`🎉 ${chalk.bold(chalk.greenBright("Done!"))}`)
    }

    outro(`🎉 ${chalk.bold(chalk.greenBright("All done!"))}`)
  }
}
