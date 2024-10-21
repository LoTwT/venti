import type { MayBeUndefined } from "@ayingott/sucrose"
import fs from "node:fs"
import process from "node:process"
import { exitProcess } from "@ayingott/sucrose"
import chalk from "chalk"
import { execa } from "execa"
import prompts from "prompts"
import * as rimraf from "rimraf"

const { bold, red, yellow, cyan, green } = chalk

const GithubPrefix = "https://github.com/"

type Platform = "github" | "gitlab"

interface CloneActionOptions {
  platform: MayBeUndefined<Platform>
  clean: MayBeUndefined<boolean>
}

const REPO_RE = /^[\dA-Z][\dA-Z\-]*\/[\w.\-]+$/i
export const validateRepo = (repo: string) => REPO_RE.test(repo)

export function ensureDotGit(repo: string) {
  return !repo.endsWith(".git") ? `${repo}.git` : repo
}

export function concatRepoPath(repo: string, platform: Platform) {
  if (platform === "github") return `${GithubPrefix}${repo}`

  if (platform === "gitlab") {
    console.log(bold(cyan("✨ Clone Gitlab repo is WIP.")))
    exitProcess()
  }

  console.error(bold(red("❌ Invalid platform")))
  exitProcess()
}

export async function cloneAction(
  repo: string,
  dirname: MayBeUndefined<string>,

  options: CloneActionOptions,
) {
  const { platform = "github", clean = false } = options

  if (!repo || !validateRepo(repo)) {
    const result = await prompts({
      type: "text",
      name: "repo",
      message: "Target repository ( user/repo )",
      validate: (value) => validateRepo(value) || "Invalid Repository",
    })

    repo = result.repo
  }

  const repoPath = ensureDotGit(`${concatRepoPath(repo, platform)}`)

  const repoDirname = repo.split("/")[1]

  const targetDirname = dirname || repoDirname
  const repoDirPath = `${process.cwd()}/${targetDirname}`

  try {
    await execa("git", ["clone", repoPath, targetDirname], {
      stdio: "inherit",
    })

    if (clean) {
      const dotGitPath = `${repoDirPath}/.git`
      console.log("===>", dotGitPath)
      fs.existsSync(dotGitPath) && rimraf.sync(dotGitPath)
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
    exitProcess()
  }
}
