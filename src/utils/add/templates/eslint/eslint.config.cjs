// @ts-check

const { defineFlatConfig } = require("@ayingott/eslint-config")

module.exports = defineFlatConfig([], {
  prettier: true,
  vue: false,
  unocss: false,
  react: false,
})
