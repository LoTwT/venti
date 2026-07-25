import {
  access,
  constants,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { cwd, execPath, exit } from "node:process"

import { detect, getCommand, serializeCommand } from "@antfu/ni"
import { getDirname } from "@ayingott/sucrose"
import { cancel, group, intro, multiselect, outro } from "@clack/prompts"
import chalk from "chalk"
import defu from "defu"
import { execaSync } from "execa"
import type { PackageJson, TSConfig } from "pkg-types"

const _dirname = getDirname(import.meta.url)
const require = createRequire(import.meta.url)
const niCliPath = require.resolve("@antfu/ni/ni")

async function exists(filePath: string) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function copyTemplate(templatePath: string, targetPath: string) {
  if (await exists(targetPath)) return false

  await copyFile(templatePath, targetPath)
  return true
}

async function getPackageManager() {
  return (await detect({ cwd: cwd(), programmatic: true })) ?? "npm"
}

export function getPackageManagerCommand(
  packageManager: Awaited<ReturnType<typeof getPackageManager>>,
  command: "execute-local" | "run",
  script: string,
) {
  return serializeCommand(getCommand(packageManager, command, [script])) ?? ""
}

const DepsMap = {
  OXLINT: "oxlint",
  OXFMT: "oxfmt",
  LINT_STAGED: "lint-staged",
  SIMPLE_GIT_HOOKS: "simple-git-hooks",
  BUMPP: "bumpp",
  VITEST: "vitest",
  TAZE: "taze",
}

const depHandlers = {
  [DepsMap.OXLINT]: handleOxlint,
  [DepsMap.OXFMT]: handleOxfmt,
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
              value: DepsMap.OXLINT,
              label: "oxlint",
            },
            {
              value: DepsMap.OXFMT,
              label: "oxfmt",
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

  const pkgJson = await getJson<PackageJson>("package.json")
  const packageManager = await getPackageManager()

  const res = await Promise.all(
    deps
      .filter(
        (dep) =>
          dep !== DepsMap.LINT_STAGED && dep !== DepsMap.SIMPLE_GIT_HOOKS,
      )
      .map((dep) => depHandlers?.[dep]?.(pkgJson)),
  )

  if (deps.includes(DepsMap.LINT_STAGED)) {
    res.push(handleLintStaged(pkgJson, deps))
  }

  if (deps.includes(DepsMap.SIMPLE_GIT_HOOKS)) {
    res.push(await handleSimpleGitHooks(pkgJson, deps, packageManager))
  }

  const depsToInstall = res
    .filter((r) => !r.existed)
    .reduce<string[]>((acc, curr) => {
      acc.push(...curr.depsToInstall)
      return acc
    }, [])

  console.log("\n")

  if (depsToInstall.length > 0) {
    const isMonorepo = await exists(resolve(cwd(), "pnpm-workspace.yaml"))
    const args = [
      "--save-dev",
      ...(isMonorepo ? ["--workspace-root"] : []),
      ...depsToInstall,
    ]

    execaSync(execPath, [niCliPath, ...args], {
      stdio: "inherit",
    })
  }

  const installedPkgJson = await getJson<PackageJson>("package.json")
  const vscodeSettings = await getJson(".vscode/settings.json")
  const tsconfig = await getJson<TSConfig>("tsconfig.json")

  await Promise.all(
    [
      {
        p: "package.json",
        d: defu({}, ...res.map((r) => r.pkgJson), installedPkgJson),
      },
      {
        p: ".vscode/settings.json",
        d: defu({}, ...res.map((r) => r.vscodeSettings || {}), vscodeSettings),
      },
      {
        p: "tsconfig.json",
        d: defu({}, ...res.map((r) => r.tsconfig || {}), tsconfig),
      },
    ].map(async (obj) => {
      const jsonPath = resolve(cwd(), obj.p)

      if (Object.keys(obj.d).length > 0) {
        await mkdir(dirname(jsonPath), { recursive: true })
        await writeFile(jsonPath, JSON.stringify(obj.d, null, 2), {
          encoding: "utf-8",
        })
      }
    }),
  )

  await Promise.all(res.filter((r) => r.callback).map((r) => r.callback?.()))

  if (
    deps.includes(DepsMap.SIMPLE_GIT_HOOKS) &&
    res.some((r) => r.pkgJson["simple-git-hooks"])
  ) {
    execaSync("simple-git-hooks", {
      cwd: cwd(),
      preferLocal: true,
      stdio: "inherit",
    })
  }

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

function handleOxlint(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.OXLINT)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 Oxlint already exists",
    }
  }

  result.depsToInstall.push(DepsMap.OXLINT)

  result.pkgJson.scripts = {
    "lint": "oxlint . --deny-warnings",
    "lint:fix": "oxlint . --fix --deny-warnings",
  }

  const vscodeSettings = {
    "editor.codeActionsOnSave": {
      "source.fixAll.oxc": "explicit",
    },
  }

  const callback = async () => {
    await copyTemplate(
      resolve(_dirname, "templates/oxlint/.oxlintrc.json"),
      resolve(cwd(), ".oxlintrc.json"),
    )
  }

  return {
    ...result,
    msg: "🎉 oxlint installed",
    vscodeSettings,
    callback,
  }
}

function handleOxfmt(pkgJson: PackageJson): DepHandlerResult {
  const result = createDefaultDepHandlerResult()

  if (hasDep(pkgJson, DepsMap.OXFMT)) {
    return {
      ...result,
      existed: true,
      msg: "🍟 oxfmt already exists",
    }
  }

  result.depsToInstall.push(DepsMap.OXFMT)

  result.pkgJson.scripts = {
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check .",
  }

  const vscodeSettings = {
    "editor.defaultFormatter": "oxc.oxc-vscode",
    "editor.formatOnSave": true,
  }

  const callback = async () => {
    await copyTemplate(
      resolve(_dirname, "templates/oxfmt/.oxfmtrc.json"),
      resolve(cwd(), ".oxfmtrc.json"),
    )
  }

  return {
    ...result,
    msg: "🎉 oxfmt installed",
    vscodeSettings,
    callback,
  }
}

function handleLintStaged(
  pkgJson: PackageJson,
  deps: string[],
): DepHandlerResult {
  const result = createDefaultDepHandlerResult()
  const alreadyInstalled = Boolean(hasDep(pkgJson, DepsMap.LINT_STAGED))
  const lintStaged: Record<string, string | string[]> = {}
  const hasOxlint =
    hasDep(pkgJson, DepsMap.OXLINT) || deps.includes(DepsMap.OXLINT)
  const hasOxfmt =
    hasDep(pkgJson, DepsMap.OXFMT) || deps.includes(DepsMap.OXFMT)

  if (hasOxlint || hasOxfmt) {
    lintStaged["*.{cjs,cts,js,jsx,mjs,mts,ts,tsx,vue}"] = [
      ...(hasOxlint ? ["oxlint --fix --deny-warnings"] : []),
      ...(hasOxfmt ? ["oxfmt --write --no-error-on-unmatched-pattern"] : []),
    ]
  }

  if (hasOxfmt) {
    lintStaged[
      "*.{css,graphql,html,json,json5,jsonc,less,md,mdx,scss,toml,yaml,yml}"
    ] = "oxfmt --write --no-error-on-unmatched-pattern"
  }

  if (Object.keys(lintStaged).length === 0) {
    return {
      ...result,
      existed: true,
      msg: "🍟 lint-staged needs oxlint or oxfmt",
    }
  }

  result.existed = alreadyInstalled
  if (!alreadyInstalled) result.depsToInstall.push(DepsMap.LINT_STAGED)
  result.pkgJson["lint-staged"] = lintStaged

  return {
    ...result,
    msg: alreadyInstalled
      ? "🎉 lint-staged configured"
      : "🎉 lint-staged installed",
  }
}

async function handleSimpleGitHooks(
  pkgJson: PackageJson,
  deps: string[],
  packageManager: Awaited<ReturnType<typeof getPackageManager>>,
): Promise<DepHandlerResult> {
  const result = createDefaultDepHandlerResult()
  const alreadyInstalled = Boolean(hasDep(pkgJson, DepsMap.SIMPLE_GIT_HOOKS))
  const hasLintStaged =
    hasDep(pkgJson, DepsMap.LINT_STAGED) ||
    (deps.includes(DepsMap.LINT_STAGED) &&
      (hasDep(pkgJson, DepsMap.OXLINT) ||
        hasDep(pkgJson, DepsMap.OXFMT) ||
        deps.includes(DepsMap.OXLINT) ||
        deps.includes(DepsMap.OXFMT)))
  const commands: string[] = []

  if (hasLintStaged) {
    commands.push(
      getPackageManagerCommand(packageManager, "execute-local", "lint-staged"),
    )
  } else {
    if (hasDep(pkgJson, DepsMap.OXLINT) || hasDepToHandle(deps, DepsMap.OXLINT))
      commands.push(getPackageManagerCommand(packageManager, "run", "lint"))
    if (hasDep(pkgJson, DepsMap.OXFMT) || hasDepToHandle(deps, DepsMap.OXFMT))
      commands.push(getPackageManagerCommand(packageManager, "run", "format"))
  }

  if (commands.length === 0) {
    return {
      ...result,
      existed: true,
      msg: "🍟 simple-git-hooks needs lint-staged, oxlint, or oxfmt",
    }
  }

  result.existed = alreadyInstalled
  if (!alreadyInstalled) result.depsToInstall.push(DepsMap.SIMPLE_GIT_HOOKS)
  result.pkgJson.scripts = {
    ...result.pkgJson.scripts,
    prepare: "simple-git-hooks",
  }
  result.pkgJson["simple-git-hooks"] = {
    "pre-commit": commands.join(" && "),
  }

  return {
    ...result,
    msg: alreadyInstalled
      ? "🎉 simple-git-hooks configured"
      : "🎉 simple-git-hooks installed",
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
    prepack: "pnpm build",
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
    await copyTemplate(
      resolve(_dirname, "templates/vitest/template.ts"),
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
