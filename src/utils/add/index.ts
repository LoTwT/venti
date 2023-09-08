import { cwd, exit } from "node:process"
import { resolve } from "node:path"
import { copyFileSync, writeFileSync } from "node:fs"
import { cancel, group, intro, multiselect, outro } from "@clack/prompts"
import chalk from "chalk"
import { type PackageJson, type TSConfig } from "pkg-types"
import { execaSync } from "execa"

const DepsMap = {
  ESLINT: "eslint",
  PRETTIER: "prettier",
  LINT_STAGED: "lint-staged",
  SIMPLE_GIT_HOOKS: "simple-git-hooks",
  BUMPP: "bumpp",
  VITEST: "vitest",
  TAZE: "taze",
}

const depHandlers = {
  [DepsMap.ESLINT]: handleESlint,
  [DepsMap.PRETTIER]: handlePrettier,
  [DepsMap.LINT_STAGED]: handleLintStaged,
  [DepsMap.SIMPLE_GIT_HOOKS]: handleSimpleGitHooks,
  [DepsMap.BUMPP]: handleBumpp,
  [DepsMap.VITEST]: handleVitest,
  [DepsMap.TAZE]: handleTaze,
}

export const addAction = async () => {
  intro(
    `🍉 ${chalk.bold(
      `${chalk.cyanBright("Follow the wind")} and ${chalk.blueBright(
        "enjoy the day",
      )}!`,
    )} 🍉`,
  )
  const { deps } = await group<{
    deps: symbol | string[]
  }>(
    {
      deps: () =>
        multiselect({
          message: "Select deps you want to install",
          options: [
            {
              value: DepsMap.ESLINT,
              label: "eslint",
              hint: "@ayingott/eslint-config",
            },
            {
              value: DepsMap.PRETTIER,
              label: "prettier",
              hint: "@ayingott/prettier-config",
            },
            { value: DepsMap.LINT_STAGED, label: "lint-staged" },
            { value: DepsMap.SIMPLE_GIT_HOOKS, label: "simple-git-hooks" },
            { value: DepsMap.BUMPP, label: "bumpp" },
            { value: DepsMap.VITEST, label: "vitest" },
            { value: DepsMap.TAZE, label: "taze" },
          ],
        }),
    },
    {
      onCancel: () => {
        cancel("❌ Operation Cancelled❗")
        exit(0)
      },
    },
  )

  const pkgJson = await getPackageJson()

  const res = await Promise.all(
    deps
      .filter((d) => d !== (DepsMap.LINT_STAGED || DepsMap.SIMPLE_GIT_HOOKS))
      .map(async (dep) => await depHandlers?.[dep]?.(pkgJson, deps)),
  )

  if (deps.includes(DepsMap.LINT_STAGED)) {
    res.push(handleLintStaged(pkgJson, deps))
  }

  if (deps.includes(DepsMap.SIMPLE_GIT_HOOKS)) {
    res.push(handleSimpleGitHooks(pkgJson, deps))
  }

  if (res.every((r) => r.existed)) {
    outro(`🎉 ${chalk.bold(chalk.greenBright("All deps already exists!"))} 🎉`)
    exit(0)
  }

  writeFileSync(
    resolve(cwd(), "package.json"),
    JSON.stringify(Object.assign({}, ...res.map((r) => r.pkgJson)), null, 2),
    { encoding: "utf-8" },
  )

  const depsToInstall = res
    .filter((r) => !r.existed)
    .reduce<string[]>((res, curr) => {
      res.push(...curr.deps)
      return res
    }, [])

  execaSync("pnpm", ["add", "--save-dev", ...depsToInstall], {
    stdio: "inherit",
  })

  console.log("\n")

  res.forEach((r) => {
    console.log(r.msg)
  })

  outro(`🎉 ${chalk.bold(chalk.greenBright("All done!"))}`)
}

async function getPackageJson(cwdPath = cwd()) {
  return (await import(resolve(cwdPath, "package.json"))) as PackageJson
}

async function getTsconfigJson(cwdPath = cwd()) {
  return (await import(resolve(cwdPath, "tsconfig.json"))) as TSConfig
}

interface DepHandlerResult {
  existed: boolean
  msg: string
  pkgJson: PackageJson
  deps: string[]
}

function createDefaultDepHandlerResult(
  pkgJson: PackageJson,
  deps: string[] = [],
): DepHandlerResult {
  return {
    existed: false,
    msg: "",
    pkgJson,
    deps,
  }
}

function hasDep(pkgJson: PackageJson, dep: string) {
  return pkgJson.dependencies?.[dep] || pkgJson.devDependencies?.[dep]
}

function handleESlint(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.ESLINT)) {
    return {
      ...result,
      existed: true,
      msg: "eslint already exists",
    }
  }

  result.deps.push(DepsMap.ESLINT, "@ayingott/eslint-config")

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    lint: "eslint .",
  }

  const isTypeModule = result.pkgJson.type === "module"

  copyFileSync(
    resolve(
      __dirname,
      `templates/eslint/eslint.config.${isTypeModule ? "mjs" : "cjs"}`,
    ),
    resolve(cwd(), "eslint.config.js"),
  )

  return {
    ...result,
    msg: "eslint installed",
  }
}

function handlePrettier(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.PRETTIER)) {
    return {
      ...result,
      existed: true,
      msg: "prettier already exists",
    }
  }

  result.deps.push(DepsMap.PRETTIER, "@ayingott/prettier-config")

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    prettier: "prettier --write .",
  }

  result.pkgJson.prettier = "@ayingott/prettier-config"

  return {
    ...result,
    msg: "prettier installed",
  }
}

function handleLintStaged(
  pkgJson: PackageJson,
  deps: string[],
): DepHandlerResult {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.LINT_STAGED)) {
    return {
      ...result,
      existed: true,
      msg: "lint-staged already exists",
    }
  }

  result.deps.push(DepsMap.LINT_STAGED)

  const commands: string[] = []

  if (hasDep(pkgJson, DepsMap.ESLINT) || deps.includes(DepsMap.ESLINT)) {
    commands.push("eslint --fix")
  }

  if (hasDep(pkgJson, DepsMap.PRETTIER) || deps.includes(DepsMap.PRETTIER)) {
    commands.push("prettier --write --ignore-unknown")
  }

  result.pkgJson["lint-staged"] = {
    "*": [...commands],
  }

  return {
    ...result,
    msg: "lint-staged installed",
  }
}

function handleSimpleGitHooks(
  pkgJson: PackageJson,
  deps: string[],
): DepHandlerResult {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.SIMPLE_GIT_HOOKS)) {
    return {
      ...result,
      existed: true,
      msg: "simple-git-hooks already exists",
    }
  }

  result.deps.push(DepsMap.SIMPLE_GIT_HOOKS)

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    prepare: "simple-git-hooks",
  }

  const hasLintStaged = deps.includes(DepsMap.LINT_STAGED)
  let command = ""

  if (hasLintStaged) command = "pnpm exec lint-staged"
  else {
    if (hasDep(pkgJson, DepsMap.ESLINT)) command = "pnpm run lint"
    if (hasDep(pkgJson, DepsMap.PRETTIER))
      command =
        command === "" ? "pnpm run prettier" : `${command} && pnpm run prettier`
  }

  result.pkgJson["simple-git-hooks"] = {
    "pre-commit": command,
  }

  return {
    ...result,
    msg: "simple-git-hooks installed",
  }
}

function handleBumpp(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.BUMPP)) {
    return {
      ...result,
      existed: true,
      msg: "bumpp already exists",
    }
  }

  result.deps.push(DepsMap.BUMPP)

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    prepublishOnly: "pnpm build",
    release: "bumpp && pnpm publish",
  }

  return {
    ...result,
    msg: "bumpp installed",
  }
}

async function handleVitest(pkgJson: PackageJson): Promise<DepHandlerResult> {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.VITEST)) {
    return {
      ...result,
      existed: true,
      msg: "vitest already exists",
    }
  }

  result.deps.push(DepsMap.VITEST, "unplugin-auto-import")

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    test: "vitest",
  }

  copyFileSync(
    resolve(__dirname, "templates/vitest/vitest.config.ts"),
    resolve(cwd(), "vitest.config.ts"),
  )

  try {
    const tsconfig = await getTsconfigJson()
    tsconfig.compilerOptions?.types?.push("vitest/globales")
    writeFileSync(
      resolve(cwd(), "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2),
      { encoding: "utf-8" },
    )

    return {
      ...result,
      msg: "vitest installed",
    }
  } catch {
    return {
      ...result,
      msg: "vitest installed, but tsconfig.json not found",
    }
  }
}

function handleTaze(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult(pkgJson)

  if (hasDep(pkgJson, DepsMap.TAZE)) {
    return {
      ...result,
      existed: true,
      msg: "taze already exists",
    }
  }

  result.deps.push(DepsMap.TAZE)

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    build: "taze latest -I",
  }

  return {
    ...result,
    msg: "taze installed",
  }
}
