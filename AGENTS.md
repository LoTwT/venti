# Agent 工作指南

项目文档主要使用中文，必要时使用英文。

- **渐进式披露**：需要了解项目文档时，以 `docs/index.md` 为统一入口，仅按当前任务需要查阅相关内容。
- **单一事实来源**：同一项知识应由一个明确的权威来源维护，其他位置通过引用使用，避免重复定义。
- **指令作用域与优先级**：遵循当前修改范围内最具体的适用规则，无法消解的指令冲突应在执行前明确指出。
- **先理解，后修改**：修改前先理解相关代码、测试、配置和既有约定，不根据名称或表象猜测行为。
- **语义明确**：代码应通过准确的命名、类型、接口和结构直接表达业务意图；准确性优先于简短，允许使用更长的函数名、类名和变量名，避免含糊缩写、泛化命名及依赖注释补充核心语义。
- **最小充分变更**：实施能够完整满足要求的最小连贯变更，不进行无关的重构、清理或格式化。
- **基于证据的验证与报告**：通过实际检查验证结果，只报告已确认的事实，并明确说明失败、跳过和未验证事项。

## 项目概览

venti 是一个个人 CLI 工具集（`@ayingott/venti`，bin 为 `venti`），面向交互式与非交互式（agent/脚本）两种用法，要求 Node.js >= 24。当前包含三个子命令：`clone`、`upgrade`、`doctor`。命令用法以 `README.md` 为单一事实来源，项目文档见 `docs/index.md`。

## 技术栈与约定

- TypeScript ESM，包管理器 pnpm，构建工具 tsdown（产物为 `dist/bin/index.mjs`）。
- CLI 框架 citty，子命令定义集中在 `src/bin/commands.ts`。
- 路径别名：`@/*` → `src/*`，`~/*` → 项目根（`tsconfig.json`、`vitest.config.ts`、`tsdown.config.ts` 三处保持同步）。
- 测试用 vitest，测试文件放在 `test/` 目录，通过 unplugin-auto-import 自动导入 vitest API（`describe`/`it`/`expect` 无需显式导入）。
- Lint 用 oxlint，格式化用 oxfmt；pre-commit 钩子（simple-git-hooks + lint-staged）会自动执行。

## 常用命令

- 开发调试：`pnpm build && pnpm cli <args>`（`src/bin/cli.js` 是对构建产物的引用）
- 测试：`pnpm test`（单次运行用 `pnpm test run`）
- 类型检查：`pnpm typecheck`
- Lint / 格式化：`pnpm lint` / `pnpm format`
- 发布：`pnpm release`（bumpp 升级版本后 npm publish）

## 验证要求

修改代码后，至少运行与改动相关的测试和 `pnpm typecheck`；涉及 CLI 参数的行为变更需覆盖 `test/cli.test.ts` 中的参数校验。
