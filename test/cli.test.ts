import { runCommand } from "citty"
import { vi } from "vitest"

import { cloneCommand, mainCommand, validateCloneArgs } from "@/bin/commands"

describe("CLI argument validation", () => {
  it("accepts supported clone arguments", () => {
    expect(() => validateCloneArgs(["user/repo"])).not.toThrow()
    expect(() =>
      validateCloneArgs([
        "user/repo",
        "target",
        "--platform",
        "gitlab",
        "--clean",
      ]),
    ).not.toThrow()
  })

  it("maps parsed clone arguments to the action adapter", async () => {
    const originalRun = cloneCommand.run
    const run = vi.fn<(args: unknown) => void>()

    try {
      run.mockImplementation(() => undefined)
      cloneCommand.run = ({ args }) => run(args)

      await runCommand(mainCommand, {
        rawArgs: [
          "clone",
          "user/repo",
          "target",
          "--platform",
          "gitlab",
          "--clean",
        ],
      })

      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({
          repo: "user/repo",
          dirname: "target",
          platform: "gitlab",
          clean: true,
        }),
      )
    } finally {
      cloneCommand.run = originalRun
    }
  })

  it("shows usage only when no subcommand is given", async () => {
    const originalRun = cloneCommand.run
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined)

    try {
      cloneCommand.run = () => undefined

      await runCommand(mainCommand, { rawArgs: ["clone", "user/repo"] })
      expect(log).not.toHaveBeenCalled()

      await runCommand(mainCommand, { rawArgs: [] })
      expect(log).toHaveBeenCalledWith(expect.stringContaining("USAGE"))
    } finally {
      cloneCommand.run = originalRun
      log.mockRestore()
    }
  })

  it("rejects unknown clone options", () => {
    expect(() => validateCloneArgs(["user/repo", "--cleen"])).toThrow(
      /Unknown option/,
    )
    expect(() =>
      validateCloneArgs(["user/repo", "--platfrom", "gitlab"]),
    ).toThrow(/Unknown option/)
  })

  it("rejects extra clone positional arguments", () => {
    expect(() => validateCloneArgs(["user/repo", "target", "extra"])).toThrow(
      "Unexpected positional argument: extra",
    )
  })
})
