import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { runCommand } from "citty"
import { execa } from "execa"
import { vi } from "vitest"

import { cloneCommand, mainCommand, validateCloneArgs } from "@/bin/commands"

import { buildTestCli, createCliCase } from "./helpers/cli"

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
    expect(() => validateCloneArgs(["user/repo", "--", "--bare"])).not.toThrow()
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

  it.each(["claude", "kimi"])(
    "rejects removed upgrade tool %s",
    async (name) => {
      const originalExitCode = process.exitCode
      const error = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined)
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined)

      try {
        await runCommand(mainCommand, {
          rawArgs: ["upgrade", name, "--dry-run", "--json"],
        })

        expect(process.exitCode).toBe(1)
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining(
            `unknown tools: ${name}. available: pnpm, brew, rust, bun`,
          ),
        )
        expect(log).not.toHaveBeenCalled()
      } finally {
        process.exitCode = originalExitCode
        error.mockRestore()
        log.mockRestore()
      }
    },
  )
})

describe("built CLI", () => {
  let cli: Awaited<ReturnType<typeof buildTestCli>>

  beforeAll(async () => {
    cli = await buildTestCli()
  }, 30_000)

  afterAll(async () => {
    if (cli) await rm(cli.root, { recursive: true, force: true })
  })

  it("keeps the executable banner and shows global help", async () => {
    expect(
      (await readFile(cli.entry, "utf8")).startsWith("#!/usr/bin/env node\n"),
    ).toBe(true)
    const fixture = await createCliCase(cli.root, cli.entry)
    const result = await fixture.run(["--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("USAGE")
  })

  it.each([
    ["--dry-run", "upgrade", "--all", "--yes", "--json"],
    ["--json", "upgrade", "brew", "--yes", "--dry-rnu"],
    ["upgrade", "brew", "--yes", "--dry-rnu"],
  ])("rejects invalid option placement or spelling: %j", async (...args) => {
    const fixture = await createCliCase(cli.root, cli.entry, ["brew"])
    const result = await fixture.run(args)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(
      /Options must follow a command|Unknown option/,
    )
    expect(await fixture.calls()).toEqual([])
  })

  it("preserves dry-run without requiring which or executing upgrades", async () => {
    const fixture = await createCliCase(cli.root, cli.entry, ["brew"])
    const result = await fixture.run([
      "upgrade",
      "brew",
      "--yes",
      "--dry-run",
      "--json",
    ])
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      dryRun: true,
      targets: [{ name: "brew", command: "brew upgrade", exists: true }],
    })
    expect(await fixture.calls()).toEqual([])
  })

  it.each([
    ["upgrade", "brew", "--json"],
    ["upgrade", "brew", "--all", "--yes", "--json"],
  ])("rejects unconfirmed or conflicting selections: %j", async (...args) => {
    const fixture = await createCliCase(cli.root, cli.entry, ["brew"])
    expect((await fixture.run(args)).exitCode).toBe(1)
    expect(await fixture.calls()).toEqual([])
  })

  it("runs available tools without which and preserves failures and missing tools", async () => {
    const fixture = await createCliCase(cli.root, cli.entry, ["brew", "bun"])
    const result = await fixture.run(
      ["upgrade", "brew,bun,rust", "--yes", "--json"],
      { VENTI_TEST_EXIT_BREW: "7" },
    )
    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout).results).toEqual([
      { name: "brew", command: "brew upgrade", status: "failed", exitCode: 7 },
      { name: "rust", command: "rustup update", status: "skipped" },
      { name: "bun", command: "bun upgrade", status: "succeeded", exitCode: 0 },
    ])
    expect(await fixture.calls()).toEqual([
      { name: "brew", args: ["upgrade"] },
      { name: "bun", args: ["upgrade"] },
    ])
  })

  it("finishes a verbose upgrade while keeping stdout as JSON", async () => {
    const fixture = await createCliCase(cli.root, cli.entry, ["brew"])
    const result = await fixture.run(["upgrade", "brew", "--yes", "--json"], {
      VENTI_TEST_OUTPUT_MIB: "110",
    })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).results[0].status).toBe("succeeded")
    expect(existsSync(join(fixture.cwd, "brew.finished"))).toBe(true)
  })

  it.each(["upgrade", "clone"])(
    "does not prompt for %s when stdin is not a TTY",
    async (command) => {
      const fixture = await createCliCase(cli.root, cli.entry)
      const preload = join(fixture.cwd, "stdio.mjs")
      await writeFile(
        preload,
        'Object.defineProperty(process.stdin, "isTTY", {value: false});\nObject.defineProperty(process.stdout, "isTTY", {value: true});\n',
      )
      const result = await fixture.run(
        command === "upgrade" ? [command] : [command, "invalid"],
        {},
        ["--import", pathToFileURL(preload).href],
      )
      expect(result.exitCode).toBe(command === "upgrade" ? 0 : 1)
      expect(result.stdout + result.stderr).toContain(
        command === "upgrade" ? "brew upgrade" : "Invalid repository",
      )
      expect(result.stdout).not.toMatch(/Select tools|Target repository/)
    },
  )

  it.each(["npm", "pnpm", "yarn", "bun"])(
    "checks a valid %s declaration",
    async (manager) => {
      const fixture = await createCliCase(cli.root, cli.entry, ["git", manager])
      await writeFile(
        join(fixture.cwd, "package.json"),
        JSON.stringify({ packageManager: `${manager}@11.22.0+sha512.abc` }),
      )
      const result = await fixture.run(["doctor", "--json"])
      expect(result.exitCode).toBe(0)
      const report = JSON.parse(result.stdout)
      expect(report.ok).toBe(true)
      expect(
        report.checks.map((check: { name: string }) => check.name),
      ).toEqual(["node", "git", "package manager", "upgrade tools"])
      expect(report.checks[2].status).toBe("pass")
      expect(await fixture.calls()).toContainEqual({
        name: manager,
        args: ["--version"],
      })
    },
  )

  it.each([
    "./probe@11.22.0",
    "git@2.55.0",
    "pnpm",
    "pnpm@",
    "pnpm@latest",
    "",
    42,
    false,
    {},
  ])(
    "reports an invalid declaration without executing it: %j",
    async (packageManager) => {
      const fixture = await createCliCase(cli.root, cli.entry, ["git"])
      await fixture.createTool("probe", fixture.cwd)
      await writeFile(
        join(fixture.cwd, "package.json"),
        JSON.stringify({ packageManager }),
      )
      const result = await fixture.run(["doctor", "--json"])
      expect(result.exitCode).toBe(1)
      const report = JSON.parse(result.stdout)
      expect(report.ok).toBe(false)
      expect(report.checks).toHaveLength(4)
      expect(report.checks[2].status).toBe("fail")
      expect(await fixture.calls()).toEqual([
        { name: "git", args: ["--version"] },
      ])
    },
  )

  it("reports malformed JSON without losing other doctor checks", async () => {
    const fixture = await createCliCase(cli.root, cli.entry, ["git"])
    await writeFile(join(fixture.cwd, "package.json"), "{")
    const result = await fixture.run(["doctor", "--json"])
    expect(result.exitCode).toBe(1)
    const report = JSON.parse(result.stdout)
    expect(report.checks).toHaveLength(4)
    expect(report.checks[2]).toMatchObject({
      status: "fail",
      detail: "cannot read package.json",
    })
  })

  it("preserves a missing git failure in the doctor exit code and report", async () => {
    const fixture = await createCliCase(cli.root, cli.entry)
    const result = await fixture.run(["doctor", "--json"])
    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      checks: expect.arrayContaining([
        {
          name: "git",
          status: "fail",
          detail: "not found",
          hint: "install git",
        },
      ]),
    })
  })

  it.each(["relative", "absolute", "leading dash", "ssh URL"])(
    "clones safely using a %s target or URL",
    async (kind) => {
      const fixture = await createCliCase(cli.root, cli.entry)
      const source = join(fixture.cwd, "source.git")
      const url =
        kind === "ssh URL"
          ? "ssh://git@venti.invalid/source.git"
          : "https://venti.invalid/source.git"
      const gitConfig = join(fixture.cwd, "gitconfig")
      await writeFile(gitConfig, "")
      const gitEnv = {
        PATH: process.env.PATH,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: gitConfig,
        GIT_ALLOW_PROTOCOL: "file",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: `url.${pathToFileURL(source).href}.insteadOf`,
        GIT_CONFIG_VALUE_0: url,
      }
      await execa("git", ["init", "--bare", source], { env: gitEnv })
      const dirname =
        kind === "absolute"
          ? join(fixture.cwd, "absolute")
          : kind === "leading dash"
            ? "--bare"
            : "target"
      const target = kind === "absolute" ? dirname : join(fixture.cwd, dirname)
      const sentinel =
        kind === "absolute" && process.platform !== "win32"
          ? join(fixture.cwd, dirname, ".git/sentinel")
          : join(fixture.cwd, "unrelated/.git/sentinel")
      await mkdir(join(sentinel, ".."), { recursive: true })
      await writeFile(sentinel, "untouched")
      const result = await fixture.run(
        ["clone", url, "--clean", "--", dirname],
        gitEnv,
      )
      expect(result.exitCode).toBe(0)
      expect(existsSync(target)).toBe(true)
      expect(existsSync(join(target, ".git"))).toBe(false)
      expect(await readFile(sentinel, "utf8")).toBe("untouched")
    },
  )

  it("propagates a failed clone exit code", async () => {
    const fixture = await createCliCase(cli.root, cli.entry, ["git"])
    const result = await fixture.run(["clone", "owner/repo", "target"], {
      VENTI_TEST_EXIT_GIT: "7",
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("fail to clone")
  })
})
