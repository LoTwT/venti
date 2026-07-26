import { validateUpgradeArgs } from "@/bin/commands"
import { parseNames, resolveTargets, upgradeEntries } from "@/utils"

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
