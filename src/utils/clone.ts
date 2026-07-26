import fs from "node:fs"
import process from "node:process"

import type { MayBeUndefined } from "@ayingott/sucrose"
import { exitProcess } from "@ayingott/sucrose"
import chalk from "chalk"
import { execa } from "execa"
import prompts from "prompts"
import * as rimraf from "rimraf"

const { bold, red, yellow, cyan, green } = chalk

const PlatformPrefixes = {
  github: "https://github.com/",
  gitlab: "https://gitlab.com/",
} as const

type Platform = keyof typeof PlatformPrefixes

interface CloneActionOptions {
  platform: MayBeUndefined<Platform>
  clean: MayBeUndefined<boolean>
  depth: MayBeUndefined<number>
}

const REPO_RE = /^[\dA-Z][\dA-Z-]*\/[\w.-]+$/i
export const validateRepo = (repo: string) => REPO_RE.test(repo)

const FULL_URL_RE = /^(https?:\/\/|git@)[\w.-]+[/:][\w./-]+$/
export const isFullRepoUrl = (repo: string) => FULL_URL_RE.test(repo)

export function ensureDotGit(repo: string) {
  return !repo.endsWith(".git") ? `${repo}.git` : repo
}

export function resolveRepoPath(repo: string, platform: Platform) {
  // full URLs are passed through untouched so pasted https/ssh URLs work
  if (isFullRepoUrl(repo)) return repo

  if (!validateRepo(repo)) throw new TypeError(`Invalid repository: ${repo}`)

  return ensureDotGit(`${PlatformPrefixes[platform]}${repo}`)
}

export function resolveTargetDirname(repo: string, dirname?: string) {
  if (dirname) return dirname

  // derive from the last path segment, stripping a trailing .git
  const last = repo
    .replace(/\.git$/, "")
    .split(/[/:]/)
    .pop()!

  return last
}

export function buildCloneArgs(
  repoPath: string,
  targetDirname: string,
  depth?: number,
) {
  return [
    "clone",
    ...(depth != null && depth > 0 ? ["--depth", String(depth)] : []),
    repoPath,
    targetDirname,
  ]
}

export async function cloneAction(
  repo: string,
  dirname: MayBeUndefined<string>,

  options: CloneActionOptions,
) {
  const { platform = "github", clean = false, depth } = options

  if (depth != null && (!Number.isInteger(depth) || depth <= 0)) {
    console.error(bold(red(`❌ Invalid depth: ${depth}`)))
    exitProcess(1)
  }

  let repoPath: string

  try {
    repoPath = resolveRepoPath(repo, platform)
  } catch {
    // interactive repair is only offered to humans; agents get a plain error
    if (!process.stdout.isTTY) {
      console.error(bold(red(`❌ Invalid repository: ${repo}`)))
      exitProcess(1)
    }

    const result = await prompts({
      type: "text",
      name: "repo",
      message: "Target repository ( user/repo )",
      validate: (value) => validateRepo(value) || "Invalid Repository",
    })

    repo = result.repo
    repoPath = resolveRepoPath(repo, platform)
  }

  const targetDirname = resolveTargetDirname(repo, dirname)
  const repoDirPath = `${process.cwd()}/${targetDirname}`

  try {
    await execa("git", buildCloneArgs(repoPath, targetDirname, depth), {
      stdio: "inherit",
    })

    if (clean) {
      const dotGitPath = `${repoDirPath}/.git`
      console.log("===>", dotGitPath)
      if (fs.existsSync(dotGitPath)) rimraf.sync(dotGitPath)
    }

    console.log(
      `
${bold(
  green(
    `🚀 Clone ${cyan(`${platform}:${repo}`)} into ${yellow(
      targetDirname,
    )} successfully!`,
  ),
)}
`,
    )
  } catch {
    console.error(`\n${bold(red(`❌ fail to clone ${yellow(repoPath)} !`))}`)
    exitProcess(1)
  }
}
