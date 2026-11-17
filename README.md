# Token Show

本地桌面 Token 用量仪表盘，支持 **opencode**、**DeepSeek Harness**、**Antigravity**、**Claude Code** 与 **Codex**。

数据只从本机客户端日志读取，不上传、不联网同步账号历史。

## 功能

- **五个客户端自动检测**：路径留空时读取当前用户的默认目录，也可在设置中指定。
- **客户端单选**：一次查看一个客户端，概览、趋势、模型、会话与最近请求同步切换。
- **时间范围**：今天、近 7 天、近 30 天、近 90 天、全部。
- **按模型堆叠的趋势图**：同一根柱子分段显示各模型的 Token、费用或请求量；展示用量最高的 5 个模型，其余归入「其他模型」。
- **指标与图表**：总 Token、输入/输出/推理、缓存读写与命中率、费用、请求数、今日用量；Token 构成环图。
- **明细视图**：按模型、按会话（Top 50）、最近请求。
- **桌面体验**：自动刷新、系统托盘、窗口置顶、关闭到托盘、中英文切换、日夜主题、一体化标题栏。

界面采用午夜蓝 + 冰青的赛博工作台风格，浅色主题为冷色对应方案。

## 支持的数据源

| 客户端 | 默认位置 | 环境变量 |
| --- | --- | --- |
| opencode | `~/.local/share/opencode/opencode.db` | — |
| DeepSeek Harness | `~/.dsh` | `DSH_HOME` |
| Antigravity | `~/.gemini/antigravity-cli` | — |
| Claude Code | `~/.claude/projects` | `CLAUDE_CONFIG_DIR` |
| Codex | `~/.codex`（含 `sessions`、`archived_sessions`） | `CODEX_HOME` |

应用只读取这些目录中的会话与用量记录；WSL、Docker、远程服务器或其它 Windows 用户下的数据需要手动指定可访问路径。

## 费用说明

只有 **opencode** 的日志包含单次费用记录。DeepSeek Harness、Claude Code、Codex 的费用显示为 0，表示**未记录账单**，不代表免费使用。

Claude Code 流式消息按消息 ID 去重；Codex 的累计用量按增量计算；缓存读写与推理 Token 不会重复计入总量。

## 隐私

- 不包含遥测、统计上报或账号同步；应用不访问网络。
- 设置保存在本机 `%APPDATA%\Token Show\config.json`。
- 仓库不包含会话日志、数据库、本机绝对路径、账号凭据或构建产物；`.gitignore` 已排除 `release/`、`node_modules/`、`dist/` 等目录。
- 应用仅解析用量、模型、时间等元数据，不展示对话正文。

## 运行

需要 Node.js 20+ 与 Windows（打包目标为 Windows x64）。

```bash
npm install
npm start        # 开发运行
npm run dist     # 生成安装版 + 免安装版
```

打包输出到 `release/<版本号>/`，例如 `release/0.4.5/`。`release/` 不纳入仓库，可单独上传到 GitHub Releases。

## 测试

```bash
node scripts/test_aggregate.js
# 以下脚本使用 Electron 内置 Node 运行
set ELECTRON_RUN_AS_NODE=1
node_modules\electron\dist\electron.exe scripts/test_dsh.js
node_modules\electron\dist\electron.exe scripts/test_new_providers.js
```

覆盖：按模型分段的聚合一致性、DSH 多帧 Zstandard 与日志追加检测、Claude 流式去重、Codex 累计差分。

## 项目结构

```text
src/
  main.js               主进程：窗口、托盘、刷新、IPC
  preload.js            安全桥接
  aggregate.js          时间范围与模型/会话聚合
  providers/            各客户端日志读取
  renderer/             界面（HTML/CSS/JS + Chart.js）
scripts/                打包与回归测试
assets/icon.png         应用图标
design-system/          界面设计记录
```

## 版本记录

- **0.4.5**：趋势图按模型堆叠；同名模型附服务商后缀；修复启动阶段切换客户端的响应竞态。
- **0.4.4**：修复快速切换后图表空白（Chart.js 动画竞态）；无费用/无用量时显示说明。
- **0.4.3**：费用趋势按实际金额自动缩放。
- **0.4.2**：客户端改为单选；重绘「用量工作台」界面。
- **0.4.1**：修复 DSH 自动刷新漏检。
- **0.4.0**：新增 Claude Code、Codex 支持。
- **0.3.0**：多客户端聚合与一体化窗口。

## License

MIT
