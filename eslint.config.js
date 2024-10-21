// @ts-check

import { defineConfig } from "@ayingott/eslint-config/antfu"

export default defineConfig({
  rules: {
    "no-console": "off",
  },
  ignores: ["**/templates/**"],
})
