import { fileURLToPath } from "node:url"

import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/bin/index.ts"],
  format: ["esm"],
  clean: true,
  dts: false,
  outDir: "dist/bin",
  outputOptions: {
    banner: "#!/usr/bin/env node",
  },
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
    "~": fileURLToPath(new URL(".", import.meta.url)),
  },
})
