import fs from "node:fs"
import process from "node:process"
import { exitProcess } from "@ayingott/sucrose"
import prompts from "prompts"
import { execa } from "execa"
import chalk from "chalk"
import * as rimraf from "rimraf"
import type { MayBeUndefined } from "@ayingott/sucrose"

const { bold, red, yellow, cyan, green } = chalk

const GithubPrefix = "https://github.com/"

type Platform = "github" | "gitlab"

interface CloneActionOptions {
  platform: MayBeUndefined<Platform>
  clean: MayBeUndefined<boolean>
}

const REPO_RE = /^[\dA-Za-z][\dA-Za-z\-]*[\dA-Za-z]?\/[\w.\-]+$/
export const validateRepo = (repo: string) => REPO_RE.test(repo)

export const ensureDotGit = (repo: string) =>
  !repo.endsWith(".git") ? `${repo}.git` : repo

export const concatRepoPath = (repo: string, platform: Platform) => {
  if (platform === "github") return `${GithubPrefix}${repo}`

  if (platform === "gitlab") {
    console.log(bold(cyan("✨ Clone Gitlab repo is WIP.")))
    exitProcess()
  }

  console.error(bold(red("❌ Invalid platform")))
  exitProcess()
}

export const cloneAction = async (
  repo: string,
  dirname: MayBeUndefined<string>,
  options: CloneActionOptions,
) => {
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
    processExit()
  }
}
