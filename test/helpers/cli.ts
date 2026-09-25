import { existsSync } from "node:fs"
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { execa } from "execa"
import { build } from "tsdown"

const projectDir = fileURLToPath(new URL("../..", import.meta.url))

export interface ToolCall {
  name: string
  args: string[]
}

export async function buildTestCli() {
  // Keep external runtime dependencies resolvable without changing dist/.
  const root = await realpath(
    await mkdtemp(join(projectDir, "node_modules/.venti-test-")),
  )
  const outDir = join(root, "dist")
  try {
    await build({ cwd: projectDir, outDir, logLevel: "silent" })
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
  return { root, entry: join(outDir, "index.mjs") }
}

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

async function createTool(name: string, directory: string) {
  const script = join(directory, `${name}.cjs`)
  await writeFile(
    script,
    `
const fs = require("node:fs");
const path = require("node:path");
const name = ${JSON.stringify(name)};
const args = process.argv.slice(2);
fs.appendFileSync(process.env.VENTI_TEST_LOG, JSON.stringify({name, args}) + "\\n");
if (args[0] === "--version") {
console.log(name === "git" ? "git version 2.55.0" : "11.22.0");
} else {
const block = Buffer.alloc(1024 * 1024, "x");
for (let i = 0; i < Number(process.env.VENTI_TEST_OUTPUT_MIB || 0); i++) fs.writeSync(1, block);
console.log("tool output");
fs.writeFileSync(path.join(process.cwd(), name + ".finished"), "done");
}
process.exitCode = Number(process.env["VENTI_TEST_EXIT_" + name.toUpperCase()] || 0);
`,
  )
  const executable = join(
    directory,
    name + (process.platform === "win32" ? ".cmd" : ""),
  )
  await writeFile(
    executable,
    process.platform === "win32"
      ? `@"${process.execPath}" "${script}" %*\r\n`
      : `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(script)} "$@"\n`,
    { mode: 0o755 },
  )
  return executable
}

export async function createCliCase(
  root: string,
  entry: string,
  tools: string[] = [],
) {
  const cwd = await mkdtemp(join(root, "case-"))
  const bin = join(cwd, "bin")
  const log = join(cwd, "calls.jsonl")
  await mkdir(bin)

  for (const name of tools) await createTool(name, bin)

  return {
    cwd,
    bin,
    createTool: (name: string, directory?: string) =>
      createTool(name, directory ?? bin),
    async calls(): Promise<ToolCall[]> {
      if (!existsSync(log)) return []
      return (await readFile(log, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    },
    run(args: string[], env: NodeJS.ProcessEnv = {}, nodeArgs: string[] = []) {
      return execa(process.execPath, [...nodeArgs, entry, ...args], {
        cwd,
        env: { PATH: bin, NO_COLOR: "1", VENTI_TEST_LOG: log, ...env },
        reject: false,
        timeout: 15_000,
      })
    },
  }
}
