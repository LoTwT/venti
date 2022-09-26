import { MayBeUndefined } from "@/types"
import prompts from "prompts"
import { execa } from "execa"
import chalk from "chalk"
import { processExit } from "@/utils"

const { bold, red, yellow, cyan, green } = chalk

const GithubPrefix = "https://github.com/"

type Platform = "github" | "gitlab"

interface CloneActionOptions {
  platform: MayBeUndefined<Platform>
}

export const cloneAction = async (
  input: MayBeUndefined<string>,
  options: CloneActionOptions,
) => {
  let repo = input ?? ""

  const { platform = "github" } = options

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

  try {
    await execa("git", ["clone", repoPath], { stdio: "inherit" })

    console.log(
      `\n${bold(green(`🚀 Clone ${yellow(repoPath)} successfully!`))}`,
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
