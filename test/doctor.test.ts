import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"

import { vi } from "vitest"

import type { DoctorCheck } from "@/utils"
import {
  evaluateNodeMajor,
  getPackageManager,
  isDoctorOk,
  majorOf,
} from "@/utils"

describe("getPackageManager", () => {
  it("reads the packageManager field from the cwd package.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "venti-doctor-"))
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
    const dir = await mkdtemp(join(tmpdir(), "venti-doctor-"))
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir)

    try {
      await expect(getPackageManager()).resolves.toBeNull()
    } finally {
      cwd.mockRestore()
    }
  })
})

describe("majorOf", () => {
  it("parses the major version with or without a v prefix", () => {
    expect(majorOf("11.17.0")).toBe(11)
    expect(majorOf("v26.5.0")).toBe(26)
    expect(majorOf("not-a-version")).toBeNull()
  })
})

describe("evaluateNodeMajor", () => {
  it("passes on the active LTS or newer", () => {
    expect(evaluateNodeMajor(24)).toBe("pass")
    expect(evaluateNodeMajor(26)).toBe("pass")
  })

  it("warns on the maintenance LTS", () => {
    expect(evaluateNodeMajor(22)).toBe("warn")
    expect(evaluateNodeMajor(23)).toBe("warn")
  })

  it("fails below the maintenance LTS", () => {
    expect(evaluateNodeMajor(20)).toBe("fail")
    expect(evaluateNodeMajor(18)).toBe("fail")
  })
})

const makeCheck = (status: DoctorCheck["status"]): DoctorCheck => ({
  name: "x",
  status,
  detail: "",
})

describe("isDoctorOk", () => {
  it("is ok without any failed check", () => {
    expect(isDoctorOk([makeCheck("pass"), makeCheck("warn")])).toBe(true)
  })

  it("is not ok when a check failed", () => {
    expect(isDoctorOk([makeCheck("pass"), makeCheck("fail")])).toBe(false)
  })
})
