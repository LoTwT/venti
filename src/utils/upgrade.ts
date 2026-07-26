import { exit } from "node:process"

import { cancel, group, intro, multiselect, outro } from "@clack/prompts"
import chalk from "chalk"
import { execa, parseCommandString } from "execa"

export interface UpgradeEntry {
  name: string
  command: string
}

export type UpgradeStatus = "succeeded" | "failed" | "skipped"

export interface UpgradeResult extends UpgradeEntry {
  status: UpgradeStatus
  exitCode?: number
}

export interface UpgradeOptions {
  /** comma-separated tool names, e.g. "brew,rust" */
  names?: string
  all?: boolean
  yes?: boolean
  dryRun?: boolean
  json?: boolean
}

export const upgradeEntries: UpgradeEntry[] = [
  {
    name: "pnpm",
    command: "pnpm update -gL --config.minimum-release-age=0",
  },
  { name: "brew", command: "brew upgrade" },
  { name: "claude", command: "claude install" },
  { name: "kimi", command: "kimi upgrade" },
  { name: "rust", command: "rustup update" },
  { name: "bun", command: "bun upgrade" },
]

export function parseNames(input: string) {
  return [
    ...new Set(
      input
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ]
}

export function resolveTargets(entries: UpgradeEntry[], names: string[]) {
  const invalid = names.filter((name) => !entries.some((e) => e.name === name))
  const targets = entries.filter((e) => names.includes(e.name))

  return { targets, invalid }
}

export async function commandExists(command: string) {
  const [file] = parseCommandString(command)
  const { exitCode } = await execa("which", [file], { reject: false })
  return exitCode === 0
}

export async function runTargets(
  targets: UpgradeEntry[],
  { quiet = false } = {},
): Promise<UpgradeResult[]> {
  const results: UpgradeResult[] = []

  for (const target of targets) {
    if (!(await commandExists(target.command))) {
      results.push({ ...target, status: "skipped" })
      continue
    }

    const [file, ...args] = parseCommandString(target.command)
    if (!quiet) intro(`🚀 ${chalk.bold(chalk.greenBright(target.command))}`)

    // stdout is piped in quiet mode so `--json` output stays parseable
    const { exitCode } = await execa(file, args, {
      reject: false,
      stdout: quiet ? "pipe" : "inherit",
      stderr: "inherit",
    })

    results.push({
      ...target,
      status: exitCode === 0 ? "succeeded" : "failed",
      exitCode,
    })
  }

  return results
}

function usageError(message: string) {
  console.error(chalk.red(`❌ ${message}`))
  process.exitCode = 1
}

async function promptTargets(): Promise<UpgradeEntry[]> {
  intro(
    `🍉 ${chalk.bold(
      `${chalk.cyanBright("Follow the wind")} and ${chalk.blueBright(
        "enjoy the day",
      )}!`,
    )} 🍉`,
  )

  const { names } = await group<{ names: symbol | string[] }>(
    {
      names: () =>
        multiselect({
          message: "Select tools you want to upgrade",
          options: upgradeEntries.map((e) => ({
            value: e.name,
            label: e.name,
            hint: e.command,
          })),
          initialValues: upgradeEntries.map((e) => e.name),
        }),
    },
    {
      onCancel: () => {
        cancel("❌ Operation Cancelled❗")
        exit(0)
      },
    },
  )

  return resolveTargets(upgradeEntries, names).targets
}

function printHumanSummary(results: UpgradeResult[]) {
  console.log("\n")

  for (const r of results) {
    const icon =
      r.status === "succeeded"
        ? chalk.green("✓")
        : r.status === "failed"
          ? chalk.red("✗")
          : chalk.yellow("⊘")
    const suffix = r.status === "failed" ? ` (exit ${r.exitCode})` : ""
    console.log(`${icon} ${r.name}: ${r.status}${suffix}`)
  }

  const failedCount = results.filter((r) => r.status === "failed").length
  outro(
    failedCount > 0
      ? chalk.bold(chalk.red(`💥 ${failedCount} upgrade(s) failed`))
      : `🎉 ${chalk.bold(chalk.greenBright("All done!"))}`,
  )
}

function applyExitCode(results: UpgradeResult[]) {
  if (results.some((r) => r.status === "failed")) process.exitCode = 1
}

export async function upgradeAction(options: UpgradeOptions = {}) {
  const {
    names,
    all = false,
    yes = false,
    dryRun = false,
    json = false,
  } = options

  if (all && names != null) {
    return usageError("--all cannot be used together with tool names")
  }

  let targets: UpgradeEntry[] | null = null

  if (all) {
    targets = upgradeEntries
  } else if (names != null) {
    const { targets: resolved, invalid } = resolveTargets(
      upgradeEntries,
      parseNames(names),
    )
    if (invalid.length > 0) {
      return usageError(
        `unknown tools: ${invalid.join(", ")}. available: ${upgradeEntries
          .map((e) => e.name)
          .join(", ")}`,
      )
    }
    if (resolved.length === 0) return usageError("no tools selected")
    targets = resolved
  }

  const isTTY = Boolean(process.stdout.isTTY)
  let interactive = false

  // no explicit selection: interactive prompt for humans, list for machines
  if (targets === null) {
    if (json || !isTTY) {
      if (json)
        console.log(JSON.stringify({ entries: upgradeEntries }, null, 2))
      else
        for (const e of upgradeEntries) console.log(`${e.name}\t${e.command}`)
      return
    }

    targets = await promptTargets()
    interactive = true

    if (targets.length === 0) {
      outro(`👋 Nothing to upgrade! 👋`)
      return
    }
  }

  if (dryRun) {
    const plan = await Promise.all(
      targets.map(async (t) => ({
        ...t,
        exists: await commandExists(t.command),
      })),
    )

    if (json) {
      console.log(JSON.stringify({ dryRun: true, targets: plan }, null, 2))
    } else {
      for (const p of plan) {
        const icon = p.exists
          ? chalk.green("✓")
          : chalk.yellow("⊘ not installed, will skip")
        console.log(`${icon} ${p.name}: ${p.command}`)
      }
    }
    return
  }

  // explicit non-interactive selection needs confirmation unless --yes
  if (!interactive && !yes) {
    return usageError("pass --yes to run upgrades without confirmation")
  }

  const results = await runTargets(targets, { quiet: json })

  if (json) console.log(JSON.stringify({ results }, null, 2))
  else printHumanSummary(results)

  applyExitCode(results)
}
