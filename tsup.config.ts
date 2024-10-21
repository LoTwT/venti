import { resolve } from "node:path"
import { cwd } from "node:process"
import { copy } from "fs-extra"
import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    target: "esnext",
    clean: true,
    cjsInterop: true,
    dts: true,
    splitting: true,
  },
  {
    entry: ["./src/bin/index.ts"],
    format: ["cjs"],
    target: "esnext",
    clean: true,
    cjsInterop: true,
    dts: false,
    splitting: true,
    outDir: "dist/bin",
    onSuccess: async () => {
      await copy(
        resolve(cwd(), "src/utils/add/templates"),
        resolve(cwd(), "dist/bin/templates"),
      )
    },
  },
])
