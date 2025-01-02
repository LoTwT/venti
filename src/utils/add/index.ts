import type { PackageJson, TSConfig } from "pkg-types"
import { resolve } from "node:path"
import { cwd, exit } from "node:process"
import { cancel, group, intro, multiselect, outro } from "@clack/prompts"
import chalk from "chalk"
import defu from "defu"
import { execaSync } from "execa"
import {
  copyFile,
  ensureFile,
  exists,
  readFile,
  remove,
  writeFile,
} from "fs-extra"

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

export async function addAction() {
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
          initialValues: Object.values(DepsMap),
        }),
    },
    {
      onCancel: () => {
        cancel("❌ Operation Cancelled❗")
        exit(0)
      },
    },
  )

  const pkgJson = await ensureAndImportJson<PackageJson>("package.json")

  const res = await Promise.all(
    deps
      .filter((d) => d !== (DepsMap.LINT_STAGED || DepsMap.SIMPLE_GIT_HOOKS))
      .map((dep) => depHandlers?.[dep]?.(pkgJson, deps)),
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

  const vscodeSettings = await ensureAndImportJson(".vscode/settings.json")
  const tsconfig = await ensureAndImportJson<TSConfig>("tsconfig.json")

  await Promise.all(
    [
      {
        p: "package.json",
        d: defu({}, ...res.map((r) => r.pkgJson), pkgJson),
      },
      {
        p: ".vscode/settings.json",
        d: Object.assign(vscodeSettings, ...res.map((r) => r.vscodeSettings)),
      },
      {
        p: "tsconfig.json",
        d: defu(tsconfig, ...res.map((r) => r.tsconfig || {})),
      },
    ].map(async (obj) => {
      const jsonPath = resolve(cwd(), obj.p)

      if (Object.keys(obj.d).length === 0) {
        await remove(jsonPath)
      } else {
        await writeFile(jsonPath, JSON.stringify(obj.d, null, 2), {
          encoding: "utf-8",
        })
      }
    }),
  )

  await Promise.all(res.filter((r) => r.callback).map((r) => r.callback?.()))

  const depsToInstall = res
    .filter((r) => !r.existed)
    .reduce<string[]>((res, curr) => {
      res.push(...curr.depsToInstall)
      return res
    }, [])

  console.log("\n")

  const isMonorepo = await exists(resolve(cwd(), "pnpm-workspace.yaml"))

  execaSync(
    "ni",
    ["--save-dev", isMonorepo ? "--workspace-root" : "", ...depsToInstall],
    {
      stdio: "inherit",
    },
  )

  // to register simple-git-hooks
  execaSync("ni", {
    stdio: "inherit",
  })

  console.log("\n")

  res.forEach((r) => {
    console.log(r.msg)
  })

  outro(`🎉 ${chalk.bold(chalk.greenBright("All done!"))}`)
}

async function getJson<T extends Record<string, any>>(
  jsonPath: string,
  cwdPath = cwd(),
) {
  const p = resolve(cwdPath, jsonPath)
  let json

  try {
    json = JSON.parse(await readFile(p, { encoding: "utf-8" }))
  } catch {
    json = {}
  }

  return json as T
}

async function ensureAndImportJson<T extends Record<string, any>>(
  jsonPath: string,
  cwdPath = cwd(),
) {
  await ensureFile(resolve(cwdPath, jsonPath))

  let json

  try {
    json = await getJson(jsonPath, cwdPath)
  } catch {
    json = {}
  }

  return json as T
}

interface DepHandlerResult {
  existed: boolean
  msg: string
  depsToInstall: string[]

  pkgJson: PackageJson
  tsconfig?: TSConfig
  vscodeSettings?: Record<string, any>

  callback?: () => Promise<void>
  // TODO
  fallback?: () => Promise<void>
}

function createDefaultDepHandlerResult(): DepHandlerResult {
  return {
    existed: false,
    msg: "",
    pkgJson: {},
    depsToInstall: [],
    tsconfig: {},
  }
}

function hasDep(pkgJson: PackageJson, dep: string) {
  return pkgJson.dependencies?.[dep] || pkgJson.devDependencies?.[dep]
}

function hasDepToHandle(deps: string[], dep: string) {
  return deps.includes(dep)
}

function handleESlint(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.ESLINT)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 ESLint already exists",
    }
  }

  result.depsToInstall.push(DepsMap.ESLINT, "@ayingott/eslint-config")

  result.pkgJson.scripts = {
    lint: "eslint .",
  }
  result.pkgJson.type = "module"

  const vscodeSettings = {
    "eslint.useFlatConfig": true,
  }

  const callback = async () => {
    await copyFile(
      resolve(__dirname, `templates/eslint/eslint.config.mjs`),
      resolve(cwd(), "eslint.config.js"),
    )
  }

  return {
    ...result,
    msg: "🎉 eslint installed",
    vscodeSettings,
    callback,
  }
}

function handlePrettier(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.PRETTIER)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 prettier already exists",
    }
  }

  result.depsToInstall.push(DepsMap.PRETTIER, "@ayingott/prettier-config")

  result.pkgJson.scripts = {
    prettier: "prettier --write .",
  }
  result.pkgJson.prettier = "@ayingott/prettier-config"

  const vscodeSettings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
    },
  }

  return {
    ...result,
    msg: "🎉 prettier installed",
    vscodeSettings,
  }
}

function handleLintStaged(
  pkgJson: PackageJson,
  deps: string[],
): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.LINT_STAGED)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 lint-staged already exists",
    }
  }

  result.depsToInstall.push(DepsMap.LINT_STAGED)

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
    msg: "🎉 lint-staged installed",
  }
}

function handleSimpleGitHooks(
  pkgJson: PackageJson,
  deps: string[],
): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.SIMPLE_GIT_HOOKS)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 simple-git-hooks already exists",
    }
  }

  result.depsToInstall.push(DepsMap.SIMPLE_GIT_HOOKS)

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    prepare: "simple-git-hooks",
  }

  const hasLintStaged = deps.includes(DepsMap.LINT_STAGED)
  let command = ""

  if (hasLintStaged) {
    command = "pnpm exec lint-staged"
  } else {
    if (hasDep(pkgJson, DepsMap.ESLINT) || hasDepToHandle(deps, DepsMap.ESLINT))
      command = "pnpm run lint"
    if (
      hasDep(pkgJson, DepsMap.PRETTIER) ||
      hasDepToHandle(deps, DepsMap.PRETTIER)
    ) {
      command =
        command === "" ? "pnpm run prettier" : `${command} && pnpm run prettier`
    }
  }

  result.pkgJson["simple-git-hooks"] = {
    "pre-commit": command,
  }

  return {
    ...result,
    msg: "🎉 simple-git-hooks installed",
  }
}

function handleBumpp(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.BUMPP)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 bumpp already exists",
    }
  }

  result.depsToInstall.push(DepsMap.BUMPP)

  result.pkgJson.scripts = {
    prepublishOnly: "pnpm build",
    release: "bumpp && pnpm publish",
  }

  return {
    ...result,
    msg: "🎉 bumpp installed",
  }
}

function handleVitest(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.VITEST)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 vitest already exists",
    }
  }

  result.depsToInstall.push(DepsMap.VITEST, "unplugin-auto-import")

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    test: "vitest",
  }

  const callback = async () => {
    await copyFile(
      resolve(__dirname, "templates/vitest/template.ts"),
      resolve(cwd(), "vitest.config.ts"),
    )
  }

  const tsconfig: TSConfig = {
    compilerOptions: {
      types: ["vitest/globals"],
    },
  }

  return {
    ...result,
    msg: "🎉 vitest installed",
    tsconfig,
    callback,
  }
}

function handleTaze(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.TAZE)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 taze already exists",
    }
  }

  result.depsToInstall.push(DepsMap.TAZE)

  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    up: "taze latest -I -f",
  }

  return {
    ...result,
    msg: "🎉 taze installed",
  }
}
