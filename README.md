# svg-editor（Lab1 Phase 1）

一个用 **TypeScript + 面向对象** 实现的 SVG 编辑器命令行工具：命令式编辑、Composite 图形树、
Command 模式撤销/重做、SVG 读写。范式层（一类一文件、无过程式自由函数、按名分派只两处）与
分层依赖方向都由 `tests/architecture` 机械校验。

架构方案、过程记录、一致性自查与质量保证见 **[doc/README.md](doc/README.md)**。

## 快速开始

```bash
npm install
npm run cli                  # 交互式 REPL
npm run demo                 # 回放 scripts/demo.cli（§6 节会话）
npm run flowchart            # 回放 scripts/flowchart.cli（§6.1 节会话）
npx tsx src/cli/main.ts --script scripts/read.cli   # 读入外部 SVG
npm test                     # 124 个测试（含架构规则）
npm run typecheck            # tsc --noEmit
npm run check                # typecheck + test
```

一次典型会话：

```text
$ npm run cli
svg-editor 0.1 — type 'help' for commands

svg> init 800 600
canvas 800x600 created
svg> create g flowchart
g#flowchart created
svg> create rect start 120 100 160 60 #4a90d9 in flowchart
rect#start created in g#flowchart
svg> tree
svg (800x600)
└── g#flowchart
    └── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9
svg> save examples/out.svg
saved to examples/out.svg (2 elements)
```

`save` 产出的 `.svg` 可直接用浏览器或 VSCode 的 SVG Preview 打开。

## 目录

| 目录 | 内容 |
|---|---|
| `src/shared/` | 零业务知识的工具类与端口：`EditorError`、`Numbers`、`Plural`、`Xml`、`Tokenizer`、`Arguments`、`FileGateway` |
| `src/domain/` | 图形模型：`Shape` 抽象、`Group`（Composite）、五种叶子、`SvgDocument`、`ShapeFactory`、`DocumentMemento` |
| `src/commands/` | Command 对象：**每条命令一个类一个文件**，含 `undo`/`redo`；`CommandRegistry` 按名分派 |
| `src/presentation/` | `tree` / `show` 的文本渲染 |
| `src/io/` | SVG 解析/序列化（`fast-xml-parser`，保序）与 `node:fs` 适配器（唯一接触文件系统的地方） |
| `src/app/` | 会话与用例编排：`EditorSession`、`CommandRunner` |
| `src/cli/` | REPL、组合根（`CompositionRoot`）与进程入口（`main`） |
| `tests/` | 架构规则 + 单元 + 命令级 + 进程入口 + transcript 回放测试（124 条） |
| `scripts/` | 可回放的 `.cli` 会话脚本 |
| `examples/` | 由脚本生成的 SVG 示例 |

## 架构约束是被测试执行的

`tests/architecture/Architecture.test.ts` 会在每次 `npm test` 时扫描 `src/`，断言：
一类一文件且文件名 = 类名、无过程式自由函数、`switch` 只出现在 `ShapeFactory`、
无人 `instanceof` 具体图形、模块依赖只向内、`node:fs` 只在 `NodeFileGateway`、无 `any`。
细节见 [doc/README.md](doc/README.md) §3.2。

