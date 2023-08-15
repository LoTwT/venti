import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    clean: true,
    target: "node16",
    dts: true,
  },
  {
    entry: ["./src/bin/index.ts"],
    format: ["cjs"],
    clean: true,
    target: "node16",
    dts: false,
    outDir: "dist/bin",
  },
])
