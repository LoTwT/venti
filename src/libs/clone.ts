import { MayBeUndefined } from "@/types"
import prompts from "prompts"
import { execa } from "execa"
import chalk from "chalk"
import { processExit } from "@/utils"
import rimraf from "rimraf"
import fs from "node:fs"

const { bold, red, yellow, cyan, green } = chalk

const GithubPrefix = "https://github.com/"

type Platform = "github" | "gitlab"

interface CloneActionOptions {
  platform: MayBeUndefined<Platform>
  clean: MayBeUndefined<boolean>
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
      console.log("===> ", dotGitPath)
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
  } catch (error) {
    console.error(`\n${bold(red(`❌ fail to clone ${yellow(repoPath)} !`))}`)
    processExit()
  }
}

const REPO_RE = /^[a-zA-Z\d]{1}[a-zA-Z\d\-]*[a-zA-Z\d]?\/[\w\-\.]+$/
export const validateRepo = (repo: string) => REPO_RE.test(repo)

export const concatRepoPath = (repo: string, platform: Platform) => {
  if (platform === "github") return `${GithubPrefix}${repo}`

  if (platform === "gitlab") {
    console.log(bold(cyan("✨ Clone Gitlab repo is WIP.")))
    processExit()
  }

  console.error(bold(red("❌ Invalid platform")))
  processExit()
}

export const ensureDotGit = (repo: string) =>
  !repo.endsWith(".git") ? `${repo}.git` : repo
