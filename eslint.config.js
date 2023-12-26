//@ts-check

import { defineFlatConfig } from "@ayingott/eslint-config"

export default defineFlatConfig(
  [
    {
      rules: {
        "no-console": "off",
      },
    },
    {
      ignores: ["**/templates/*"],
    },
  ],
  {
    vue: false,
    react: false,
    unocss: false,
    prettier: true,
  },
)
