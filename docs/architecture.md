# 架构说明

## 目录结构

```
src/
  bin/
    index.ts      # CLI 入口：严格预校验后 runMain(mainCommand)
    commands.ts   # citty 命令定义与参数校验
    cli.js        # 开发调试用，引用构建产物 dist/bin/index.mjs
  utils/
    clone.ts      # clone 命令的实现
    upgrade.ts    # upgrade 命令的实现（工具清单 upgradeEntries 在此维护）
    doctor.ts     # doctor 命令的实现
    index.ts      # utils 的统一导出
test/             # vitest 测试，与 src/utils 一一对应，另有 cli.test.ts 覆盖参数层
```

构建入口是 `src/bin/index.ts`，tsdown 产出单文件 ESM `dist/bin/index.mjs`（带 `#!/usr/bin/env node` banner），即 `package.json` 的 `bin.venti`。`src/index.ts` 为空文件，仅占位。

## 命令注册与参数校验

- 三个子命令（`clone`、`upgrade`、`doctor`）用 citty 的 `defineCommand` 定义在 `src/bin/commands.ts`，挂载到 `mainCommand.subCommands`；`mainCommand.run` 仅在无子命令时打印 usage。
- citty 解析参数较宽松，因此 `src/bin/index.ts` 在 `runMain` 之前用 `validateCommandArgs`（基于 `node:util` 的 `parseArgs`，strict 模式）对子命令参数做一次严格预校验：未知选项、多余的 positional 参数会直接报错并以退出码 1 结束。校验规则从命令的 `args` 定义派生，包括 camelCase 到 kebab-case 的自动别名，新增/修改参数时无需额外同步。
- 每个命令的 `run` 只是把解析后的 args 适配给 `src/utils/` 里对应的 action，业务逻辑全部在 utils 层，便于脱离 CLI 直接测试。

## 非交互设计

CLI 同时服务人类（TTY）与 agent/脚本（非 TTY），行为分支约定：

- `clone`：仓库名非法时，TTY 下进入交互式修补提示，非 TTY 下直接报错退出。
- `upgrade`：未指定工具时，TTY 下弹出多选交互，非 TTY 或 `--json` 时列出可用工具后退出；显式指定工具的运行必须带 `--yes` 确认；`--dry-run` 只打印计划。未安装的工具标记为 `skipped`。
- `doctor`：`--json` 输出机器可读结果；任何检查失败时退出码为 1。
- `--json` 模式下子进程的 stdout 会被接管（pipe），保证 JSON 输出可解析。

新增命令或选项时应保持这一约定：非 TTY 环境不得阻塞在交互提示上。

## 测试分布

- `test/cli.test.ts`：参数校验与 args 到 action 的映射（用 citty 的 `runCommand` 驱动）。
- `test/clone.test.ts` / `upgrade.test.ts` / `doctor.test.ts`：对应 utils 的纯函数与行为（URL 解析、工具名解析、检查评估等）。
- `test/index.test.ts`：utils 导出面。
