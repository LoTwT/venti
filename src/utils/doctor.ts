import fs from "node:fs"
import path from "node:path"
import process from "node:process"

import type { Nullable } from "@ayingott/sucrose"
import chalk from "chalk"
import { execa } from "execa"

import { commandExists, upgradeEntries } from "./upgrade"

export type DoctorStatus = "pass" | "warn" | "fail"

export interface DoctorCheck {
  name: string
  status: DoctorStatus
  detail: string
  hint?: string
}

export interface DoctorOptions {
  json?: boolean
}

// node LTS baselines: NODE_LTS_MAJOR is the active LTS, NODE_MIN_MAJOR the
// oldest one still in maintenance — bump them as LTS schedules move
const NODE_LTS_MAJOR = 24
const NODE_MIN_MAJOR = 22

export function majorOf(version: string): Nullable<number> {
  const major = Number(version.replace(/^v/, "").split(".")[0])
  return Number.isNaN(major) ? null : major
}

export function evaluateNodeMajor(major: number): DoctorStatus {
  if (major >= NODE_LTS_MAJOR) return "pass"
  if (major >= NODE_MIN_MAJOR) return "warn"
  return "fail"
}

export function isDoctorOk(checks: DoctorCheck[]) {
  return !checks.some((c) => c.status === "fail")
}

export async function getPackageManager() {
  const packageJsonPath = path.resolve(process.cwd(), "package.json")

  let packageManager: Nullable<string> = null

  if (fs.existsSync(packageJsonPath))
    packageManager =
      JSON.parse(await fs.promises.readFile(packageJsonPath, "utf8"))
        ?.packageManager ?? null

  return packageManager
}

function checkNode(): DoctorCheck {
  const version = process.version
  const status = evaluateNodeMajor(majorOf(version) ?? 0)

  return {
    name: "node",
    status,
    detail: version,
    hint:
      status === "pass"
        ? undefined
        : `active LTS is ${NODE_LTS_MAJOR}.x, consider upgrading`,
  }
}

async function checkGit(): Promise<DoctorCheck> {
  const { exitCode, stdout } = await execa("git", ["--version"], {
    reject: false,
  })

  if (exitCode !== 0) {
    return {
      name: "git",
      status: "fail",
      detail: "not found",
      hint: "install git",
    }
  }

  return {
    name: "git",
    status: "pass",
    detail: stdout.replace(/^git version\s*/, ""),
  }
}

async function checkPackageManager(): Promise<DoctorCheck> {
  const declared = await getPackageManager()

  if (!declared) {
    return {
      name: "package manager",
      status: "warn",
      detail: "no packageManager field in package.json",
      hint: 'declare one, e.g. "packageManager": "pnpm@11.17.0"',
    }
  }

  const at = declared.lastIndexOf("@")
  const name = declared.slice(0, at)
  const declaredMajor = majorOf(declared.slice(at + 1))

  const { exitCode, stdout } = await execa(name, ["--version"], {
    reject: false,
  })

  if (exitCode !== 0) {
    return {
      name: "package manager",
      status: "fail",
      detail: `${declared} declared but ${name} is not installed`,
      hint: `install ${name}@${declaredMajor ?? ""}`,
    }
  }

  const actualMajor = majorOf(stdout.trim())

  if (declaredMajor != null && actualMajor !== declaredMajor) {
    return {
      name: "package manager",
      status: "warn",
      detail: `${name} ${stdout.trim()} installed, ${declared} declared`,
      hint: `major version mismatch, expected ${name}@${declaredMajor}.x`,
    }
  }

  return {
    name: "package manager",
    status: "pass",
    detail: `${name} ${stdout.trim()}`,
  }
}

async function checkUpgradeTools(): Promise<DoctorCheck> {
  const availability = await Promise.all(
    upgradeEntries.map(async (e) => ({
      name: e.name,
      exists: await commandExists(e.command),
    })),
  )

  const missing = availability.filter((a) => !a.exists).map((a) => a.name)

  return {
    name: "upgrade tools",
    status: "pass",
    detail:
      missing.length === 0 ? "all available" : `missing: ${missing.join(", ")}`,
  }
}

export async function runDoctorChecks(): Promise<DoctorCheck[]> {
  return Promise.all([
    checkNode(),
    checkGit(),
    checkPackageManager(),
    checkUpgradeTools(),
  ])
}

const statusIcons: Record<DoctorStatus, string> = {
  pass: chalk.green("✓"),
  warn: chalk.yellow("⚠"),
  fail: chalk.red("✗"),
}

function printHumanReport(checks: DoctorCheck[]) {
  console.log("")

  for (const check of checks) {
    console.log(`${statusIcons[check.status]} ${check.name}: ${check.detail}`)
    if (check.hint && check.status !== "pass")
      console.log(chalk.dim(`  ↳ ${check.hint}`))
  }

  const failed = checks.filter((c) => c.status === "fail").length
  const warned = checks.filter((c) => c.status === "warn").length

  console.log("")
  console.log(
    failed > 0
      ? chalk.bold(
          chalk.red(`💥 ${failed} check(s) failed, ${warned} warning(s)`),
        )
      : warned > 0
        ? chalk.bold(
            chalk.yellow(`✨ all checks passed with ${warned} warning(s)`),
          )
        : chalk.bold(chalk.greenBright("🎉 all checks passed")),
  )
}

export async function doctorAction(options: DoctorOptions = {}) {
  const checks = await runDoctorChecks()
  const ok = isDoctorOk(checks)

  if (options.json) console.log(JSON.stringify({ ok, checks }, null, 2))
  else printHumanReport(checks)

  if (!ok) process.exitCode = 1
}
