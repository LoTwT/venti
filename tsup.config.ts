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
  },
])
