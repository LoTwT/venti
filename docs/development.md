# 开发指南

## 环境要求

- Node.js >= 24（`package.json` 的 `engines`，构建 target 也由此推导）
- pnpm 11.17.0（`packageManager` 字段锁定）

```bash
pnpm install
```

## 常用脚本

| 命令                                | 说明                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| `pnpm build`                        | tsdown 构建到 `dist/bin/`                                  |
| `pnpm cli <args>`                   | 运行构建产物（等价于 `node ./src/bin/cli.js`），需先 build |
| `pnpm test`                         | vitest（watch 模式）；CI/单次运行用 `pnpm test run`        |
| `pnpm typecheck`                    | `tsc --noEmit`                                             |
| `pnpm lint` / `pnpm lint:fix`       | oxlint 检查 / 自动修复（`--deny-warnings`）                |
| `pnpm format` / `pnpm format:check` | oxfmt 格式化 / 检查                                        |
| `pnpm play`                         | 在 `playground/` 中运行 venti                              |
| `pnpm release`                      | bumpp 升级版本并 `npm publish --access public`             |

提交前 simple-git-hooks 会通过 lint-staged 对暂存文件执行 `oxlint --fix` 和 `oxfmt --write`。

## 修改 checklist

1. 改完代码后运行 `pnpm test run` 和 `pnpm typecheck`，必要时加 `pnpm lint`。
2. 行为变更需同步测试：CLI 参数层看 `test/cli.test.ts`，utils 逻辑看对应的 `test/*.test.ts`。
3. 命令用法变更需同步 `README.md`（用法说明的单一事实来源）；结构或流程变更需同步 `docs/architecture.md` / 本文档。
4. 新增路径别名时，`tsconfig.json`、`vitest.config.ts`、`tsdown.config.ts` 三处都要改。

## 发布流程

`pnpm release` 使用 bumpp 交互式选择版本号，随后构建并发布到 npm（`prepack`/`prepublishOnly` 会自动再构建一次）。
