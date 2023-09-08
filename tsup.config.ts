import { cwd } from "node:process"
import { resolve } from "node:path"
import { copy } from "fs-extra"
import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    clean: true,
    target: "esnext",
    dts: true,
    splitting: true,
    cjsInterop: true,
  },
  {
    entry: ["./src/bin/index.ts"],
    format: ["cjs"],
    clean: true,
    target: "esnext",
    dts: false,
    outDir: "dist/bin",
    splitting: true,
    cjsInterop: true,
    onSuccess: async () => {
      await copy(
        resolve(cwd(), "src/utils/add/templates"),
        resolve(cwd(), "dist/bin/templates"),
      )
    },
  },
])
