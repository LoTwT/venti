import { multiselect } from "@clack/prompts"
import { vi } from "vitest"

import { validateUpgradeArgs } from "@/bin/commands"
import {
  parseNames,
  resolveTargets,
  upgradeAction,
  upgradeEntries,
} from "@/utils"

vi.mock("@clack/prompts", async (importOriginal) => {
  const prompts = await importOriginal<typeof import("@clack/prompts")>()
  return {
    ...prompts,
    intro: vi.fn<typeof prompts.intro>(),
    outro: vi.fn<typeof prompts.outro>(),
    multiselect: vi.fn<typeof prompts.multiselect>(),
  }
})

describe("upgrade argument validation", () => {
  it("accepts supported upgrade arguments", () => {
    expect(() => validateUpgradeArgs(["brew,rust"])).not.toThrow()
    expect(() =>
      validateUpgradeArgs(["--all", "--yes", "--dry-run", "--json"]),
    ).not.toThrow()
    expect(() => validateUpgradeArgs(["brew", "-y"])).not.toThrow()
  })

  it("rejects unknown upgrade options", () => {
    expect(() => validateUpgradeArgs(["--al"])).toThrow(/Unknown option/)
  })

  it("rejects extra upgrade positional arguments", () => {
    expect(() => validateUpgradeArgs(["brew", "rust"])).toThrow(
      "Unexpected positional argument: rust",
    )
  })
})

describe("parseNames", () => {
  it("splits, trims and dedupes comma-separated names", () => {
    expect(parseNames("brew,rust")).toEqual(["brew", "rust"])
    expect(parseNames(" brew , rust ,brew,")).toEqual(["brew", "rust"])
    expect(parseNames("")).toEqual([])
  })
})

describe("upgrade entries", () => {
  it("disables the minimum release age for pnpm updates", () => {
    expect(upgradeEntries.find((entry) => entry.name === "pnpm")?.command).toBe(
      "pnpm update -gL --config.minimum-release-age=0",
    )
  })
})

describe("interactive upgrades", () => {
  it("offers Claude without preselecting it and keeps other tools selected", async () => {
    const stdinTTY = process.stdin.isTTY
    const stdoutTTY = process.stdout.isTTY
    vi.mocked(multiselect).mockResolvedValueOnce([])

    try {
      process.stdin.isTTY = true
      process.stdout.isTTY = true

      await upgradeAction()

      expect(multiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            { value: "claude", label: "claude", hint: "claude install" },
          ]),
          initialValues: ["pnpm", "brew", "rust", "bun"],
        }),
      )
    } finally {
      process.stdin.isTTY = stdinTTY
      process.stdout.isTTY = stdoutTTY
    }
  })
})

describe("resolveTargets", () => {
  it("resolves known names in registry order", () => {
    const { targets, invalid } = resolveTargets(upgradeEntries, ["bun", "brew"])
    expect(targets.map((t) => t.name)).toEqual(["brew", "bun"])
    expect(invalid).toEqual([])
  })

  it("collects unknown names", () => {
    const { targets, invalid } = resolveTargets(upgradeEntries, [
      "brew",
      "deno",
    ])
    expect(targets.map((t) => t.name)).toEqual(["brew"])
    expect(invalid).toEqual(["deno"])
  })
})
