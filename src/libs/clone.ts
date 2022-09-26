import { MayBeUndefined } from "@/types"
import prompts from "prompts"
import { execa } from "execa"
import chalk from "chalk"

const GithubPrefix = "https://github.com/"

export const cloneAction = async (input: MayBeUndefined<string>) => {
  let repo = input ?? ""

  if (!repo || !validateRepo(repo)) {
    const result = await prompts({
      type: "text",
      name: "repo",
      message: "Target repository ( user/repo )",
      validate: (value) => validateRepo(value) || "Invalid repository",
    })

    repo = result.repo
  }

  const repoPath = ensureDotGit(`${GithubPrefix}${repo}`)

  try {
    await execa("git", ["clone", repoPath], { stdio: "inherit" })

    console.log(
      `\n${chalk.bold(
        chalk.green(`🚀 Clone ${chalk.yellow(repo)} successfully!`),
      )}`,
    )
  } catch (error) {
    console.error(
      `\n${chalk.bold(chalk.red(`❌ fail to clone ${chalk.yellow(repo)} !`))}`,
    )
  }
}

const REPO_RE = /^[a-zA-Z\d]{1}[a-zA-Z\d\-]*[a-zA-Z\d]?\/[\w\-\.]+$/
export const validateRepo = (repo: string) => REPO_RE.test(repo)

export const ensureDotGit = (repo: string) =>
  !repo.endsWith(".git") ? `${repo}.git` : repo
