import type { Nullable } from "@ayingott/sucrose"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import envinfo from "envinfo"

const infoStrategies: Record<string, (...args: any) => string> = {
  System: (info: Record<string, any>) => {
    return `System:
${Object.entries(info.System).reduce(
  (prev, [key, value]) => `${prev}  - ${key}: ${value}\n`,
  "",
)}`
  },
  Binaries: (info: Record<string, any>) => {
    const binaries = Object.entries(info?.Binaries ?? [])

    if (binaries.length === 0) return ""

    return `Binaries:
${binaries.reduce(
  (prev, [key, value]) => `${prev}  - ${key}: ${(value as any).version}\n`,
  "",
)}`
  },
  npmPackages: (info: Record<string, any>) => {
    const npmPackages = Object.entries(info?.npmPackages ?? [])

    if (npmPackages.length === 0) return ""

    return `npmPackages:
${npmPackages.reduce(
  (prev, [key, value]) => `${prev}  - ${key}: ${(value as any).installed}\n`,
  "",
)}`
  },
}

async function getPackageManager() {
  const packageJsonPath = path.resolve(process.cwd(), "package.json")

  let packageManager: Nullable<string> = null

  if (fs.existsSync(packageJsonPath))
    packageManager = (await import(packageJsonPath))?.packageManager ?? null

  return packageManager
}

function getResult(info: Record<string, any>) {
  return ["System", "Binaries", "npmPackages"].reduce(
    (prev, curr) => `${prev}\n${infoStrategies?.[curr]?.(info)}`,
    "",
  )
}

export async function envAction() {
  const res = await envinfo.run(
    {
      System: ["OS"],
      Binaries: ["Node", "npm"],
      npmPackages: ["typescript", "vue", "nuxt", "react", "vite", "webpack"],
    },
    { showNotFound: false, json: true },
  )

  const info = JSON.parse(res)

  const packageManager = await getPackageManager()

  if (packageManager) {
    const [pm, v] = packageManager.split("@")

    if (pm && v) {
      delete info?.Binaries?.npm
      info.Binaries[pm] = { version: v }
    }
  }

  console.log(getResult(info))
}
