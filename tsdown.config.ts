import { cp } from "node:fs/promises"
import { resolve } from "node:path"
import { cwd } from "node:process"
import { fileURLToPath } from "node:url"
import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/bin/index.ts"],
  format: ["esm"],
  target: "esnext",
  clean: true,
  dts: false,
  outDir: "dist/bin",
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
    "~": fileURLToPath(new URL(".", import.meta.url)),
  },
  onSuccess: async () => {
    await cp(
      resolve(cwd(), "src/utils/add/templates"),
      resolve(cwd(), "dist/bin/templates"),
      { recursive: true },
    )
  },
})
