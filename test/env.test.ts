import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"

import { vi } from "vitest"

import { getPackageManager } from "@/utils"

describe("getPackageManager", () => {
  it("reads the packageManager field from the cwd package.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "venti-env-"))
    await writeFile(
      join(dir, "package.json"),
      '{"packageManager":"pnpm@11.17.0"}',
    )

    const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir)

    try {
      await expect(getPackageManager()).resolves.toBe("pnpm@11.17.0")
    } finally {
      cwd.mockRestore()
    }
  })

  it("returns null when no package.json exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "venti-env-"))
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir)

    try {
      await expect(getPackageManager()).resolves.toBeNull()
    } finally {
      cwd.mockRestore()
    }
  })
})
