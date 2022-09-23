import { Nullable } from "@/types"
import envinfo from "envinfo"
import fs from "node:fs"
import path from "node:path"

export const envAction = async () => {
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
      info["Binaries"][pm] = { version: v }
    }
  }

  console.log(getResult(info))
}

const getPackageManager = async () => {
  const packageJsonPath = path.resolve(process.cwd(), "package.json")

  let packageManager: Nullable<string> = null

  if (fs.existsSync(packageJsonPath))
    packageManager = require(packageJsonPath)?.packageManager ?? null

  return packageManager
}

const infoStrategies: Record<string, (...args: any) => string> = {
  System: (info: Record<string, any>) => {
    return `System:
${Object.entries(info.System).reduce(
  (prev, [key, value]) => prev + `  - ${key}: ${value}\n`,
  "",
)}`
  },
  Binaries: (info: Record<string, any>) => {
    return `Binaries:
${Object.entries(info.Binaries).reduce(
  (prev, [key, value]) => prev + `  - ${key}: ${(value as any).version}\n`,
  "",
)}`
  },
  npmPackages: (info: Record<string, any>) => {
    return `npmPackages:
${Object.entries(info.npmPackages).reduce(
  (prev, [key, value]) => prev + `  - ${key}: ${(value as any).installed}\n`,
  "",
)}`
  },
}

const getResult = (info: Record<string, any>) =>
  ["System", "Binaries", "npmPackages"].reduce(
    (prev, curr) => prev + "\n" + infoStrategies?.[curr]?.(info),
    "",
  )
