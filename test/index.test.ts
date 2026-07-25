import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { copyTemplate, getPackageManagerCommand } from "@/utils"

describe("ts-starter", () => {
  it("happy path", () => {
    expect(1).toBe(1)
  })

  it("preserves existing configuration files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "venti-template-"))
    const templatePath = join(dir, "template.json")
    const targetPath = join(dir, "target.json")

    await writeFile(templatePath, '{"source":true}')
    await writeFile(targetPath, '{"existing":true}')

    expect(await copyTemplate(templatePath, targetPath)).toBe(false)
    expect(await readFile(targetPath, "utf8")).toBe('{"existing":true}')
  })

  it("generates package-manager-specific hook commands", () => {
    expect(
      getPackageManagerCommand("npm", "execute-local", "lint-staged"),
    ).toBe("npx lint-staged")
    expect(getPackageManagerCommand("pnpm", "run", "lint")).toBe(
      "pnpm run lint",
    )
    expect(getPackageManagerCommand("yarn", "run", "format")).toBe(
      "yarn run format",
    )
    expect(
      getPackageManagerCommand("bun", "execute-local", "lint-staged"),
    ).toBe("bun x lint-staged")
  })
})
