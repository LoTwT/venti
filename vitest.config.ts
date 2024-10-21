import { fileURLToPath, URL } from "node:url"
import AutoImport from "unplugin-auto-import/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    AutoImport({
      imports: ["vitest"],
    }),
  ],
  test: {
    includeSource: ["src/*"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "~": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
})
