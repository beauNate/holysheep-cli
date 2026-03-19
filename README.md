# 🐑 HolySheep CLI

<div align="center">

**[English](#english) | [中文](#chinese)**

[![npm version](https://img.shields.io/npm/v/@simonyea/holysheep-cli?color=orange&label=npm)](https://www.npmjs.com/package/@simonyea/holysheep-cli)
[![npm downloads](https://img.shields.io/npm/dm/@simonyea/holysheep-cli?color=blue)](https://www.npmjs.com/package/@simonyea/holysheep-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Register](https://img.shields.io/badge/🔑_Get_API_Key-holysheep.ai-brightgreen)](https://holysheep.ai/register)

<br/>

**One command to configure all AI coding tools with HolySheep API**<br/>
**一条命令，配置所有 AI 编程工具**

<br/>

[🚀 Quick Start](#quick-start) · [📦 npm](https://www.npmjs.com/package/@simonyea/holysheep-cli) · [🌐 holysheep.ai](https://holysheep.ai)

</div>

---

<a name="english"></a>

## 🇬🇧 English

### What is HolySheep CLI?

**HolySheep CLI** (`hs`) is a command-line tool that automatically configures all popular AI coding assistants to use [HolySheep API](https://holysheep.ai) — a relay service for accessing Claude, GPT, and Gemini APIs in China without a VPN.

Instead of manually editing config files for each tool, run one command and you're done.

### Supported Tools

| Tool | Config File | Status |
|------|-------------|--------|
| [Claude Code](https://docs.anthropic.com/claude-code) | `~/.claude/settings.json` | ✅ Auto |
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/config.toml` | ✅ Auto |
| Droid CLI | `~/.factory/settings.json` | ✅ Auto |
| [Aider](https://aider.chat) | `~/.aider.conf.yml` | ✅ Auto |
| [Continue.dev](https://continue.dev) | `~/.continue/config.yaml` | ✅ Auto |
| [OpenCode](https://github.com/anomalyco/opencode) | `~/.config/opencode/opencode.json` | ✅ Auto |
| [OpenClaw](https://openclaw.ai) | `~/.openclaw/openclaw.json` | ✅ Auto |
| [Cursor](https://cursor.sh) | GUI (encrypted storage) | ⚠️ Manual |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google protocol only | ❌ Not supported |

### Quick Start

> 🔑 **First, get your free API Key** → [**holysheep.ai/register**](https://holysheep.ai/register) (free signup, pay-as-you-go from ¥10)

```bash
npx @simonyea/holysheep-cli@latest setup
```

Or install globally:

```bash
npm install -g @simonyea/holysheep-cli
hs setup
```

You'll be prompted for your API Key (`cr_xxx`), then select the tools to configure. Done!

### OpenClaw Setup

[OpenClaw](https://openclaw.ai) is a powerful AI agent gateway with a web dashboard. After running `hs setup`:

1. HolySheep configures OpenClaw to use HolySheep API
2. The OpenClaw Gateway starts on **`http://127.0.0.1:18789/` by default**
3. If `18789` is occupied, `hs setup` automatically picks the next available local port
4. Open the exact browser URL shown in the terminal and start chatting — no token required

**Default OpenClaw model:** `gpt-5.4`

> **Keep the gateway window open** while using OpenClaw. The gateway must be running for the browser UI to work.

> **OpenClaw itself requires Node.js 20+**. If setup fails, first check `node --version`.

To restart the gateway later:
```bash
openclaw gateway --port <shown-port>
# or
npx openclaw gateway --port <shown-port>
```

If you forget the port, check `~/.openclaw/openclaw.json` (`gateway.port`) or run `hs doctor`.

### Commands

| Command | Description |
|---------|-------------|
| `hs setup` | Configure AI tools interactively |
| `hs login` | Save your API Key locally |
| `hs doctor` | Check configuration & connectivity |
| `hs balance` | View account balance |
| `hs tools` | List all supported tools |
| `hs reset` | Remove all HolySheep configuration |

### API Endpoints

| Usage | URL |
|-------|-----|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai` (no `/v1`) |
| OpenAI-compatible / Codex / Aider | `https://api.holysheep.ai/v1` (with `/v1`) |

---

<a name="chinese"></a>

## 🇨🇳 中文

### 什么是 HolySheep CLI？

**HolySheep CLI**（命令 `hs`）是一个命令行工具，帮你一键配置所有主流 AI 编程助手接入 [HolySheep API](https://holysheep.ai)。

无需 VPN，无需手动改配置文件，运行一条命令即可接入 Claude、GPT、Gemini。

### 支持的工具

| 工具 | 状态 | 说明 |
|------|------|------|
| [Claude Code](https://docs.anthropic.com/claude-code) | ✅ 自动 | Anthropic 官方 CLI |
| [Codex CLI](https://github.com/openai/codex) | ✅ 自动 | OpenAI 官方 CLI |
| Droid CLI | ✅ 自动 | Factory AI 终端智能体 |
| [Aider](https://aider.chat) | ✅ 自动 | AI 结对编程 |
| [Continue.dev](https://continue.dev) | ✅ 自动 | VS Code/JetBrains 插件 |
| [OpenCode](https://github.com/anomalyco/opencode) | ✅ 自动 | 终端 AI 编程助手 |
| [OpenClaw](https://openclaw.ai) | ✅ 自动 | AI 智能体网关 + Web 界面 |
| [Cursor](https://cursor.sh) | ⚠️ 手动 | 需在 GUI 中手动配置 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | ❌ 不支持 | 仅支持 Google 官方协议 |

### 快速开始

> 🔑 **第一步：注册获取 API Key** → [**holysheep.ai/register**](https://holysheep.ai/register)（免费注册，¥10 起充，按量计费）

```bash
npx @simonyea/holysheep-cli@latest setup
```

或全局安装：

```bash
npm install -g @simonyea/holysheep-cli
hs setup
```

按提示输入 API Key（`cr_xxx`），选择要配置的工具，完成！

### OpenClaw 使用说明

[OpenClaw](https://openclaw.ai) 是一个 AI 智能体网关，提供浏览器 Web 界面，支持聊天、任务、工具调用等功能。

**`hs setup` 配置完成后：**

1. HolySheep 会自动把 OpenClaw 接到 HolySheep API
2. 默认启动在 **`http://127.0.0.1:18789/`**
3. 如果 `18789` 被占用，`hs setup` 会自动切换到下一个可用本地端口
4. 按终端里显示的准确地址打开浏览器，直接开始聊天，无需填写 token

**OpenClaw 默认模型：** `gpt-5.4`

> ⚠️ **保持 Gateway 窗口开启**，关闭后 Gateway 停止，浏览器界面无法使用。

> ⚠️ **OpenClaw 自身要求 Node.js 20+**。如果配置失败，请先运行 `node --version` 检查版本。

**下次启动 Gateway：**
```bash
openclaw gateway --port <显示的端口>
# 或
npx openclaw gateway --port <显示的端口>
```

如果忘了端口，可以查看 `~/.openclaw/openclaw.json` 里的 `gateway.port`，或直接运行 `hs doctor`。

**默认模型：** `gpt-5.4`（可在 OpenClaw 内切换到 Claude 模型）

### 命令说明

| 命令 | 说明 |
|------|------|
| `hs setup` | 交互式配置 AI 工具 |
| `hs login` | 保存 API Key 到本地 |
| `hs doctor` | 检查配置状态和连通性 |
| `hs balance` | 查看账户余额 |
| `hs tools` | 列出所有支持的工具 |
| `hs reset` | 清除所有 HolySheep 配置 |

### 接入地址

| 用途 | 地址 |
|------|------|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai`（不带 /v1） |
| OpenAI 兼容 / Codex / Aider | `https://api.holysheep.ai/v1`（带 /v1） |

### 常见问题

**Q: API Key 在哪里获取？**  
A: 在 [holysheep.ai](https://holysheep.ai) 注册后，在「API 密钥」页面创建，格式为 `cr_xxx`。

**Q: 支持 Windows 吗？**  
A: 支持，需要 Node.js 16+。如果 `hs` 命令找不到，请重启终端，或直接用 `npx @simonyea/holysheep-cli@latest setup`。

**Q: OpenClaw Gateway 窗口可以最小化吗？**  
A: 可以最小化，但不能关闭。关闭后 Gateway 停止，需要按 `hs setup` / `hs doctor` 显示的端口重新运行 `openclaw gateway --port <端口>` 或 `npx openclaw gateway --port <端口>`。

**Q: 18789 端口被占用怎么办？**  
A: `hs setup` 会自动切换到下一个可用本地端口，并把准确访问地址打印出来；也可以运行 `hs doctor` 查看当前 `gateway.port` 和端口占用情况。

**Q: 如何恢复原来的配置？**  
A: 运行 `hs reset` 清除所有 HolySheep 相关配置。

**Q: OpenClaw 安装失败？**  
A: OpenClaw 需要 Node.js 20+，运行 `node --version` 确认版本后重试；如果全局安装失败，`hs setup` 也会尽量回退到 `npx openclaw` 继续配置。

---

## Changelog

- **v1.6.12** — 修复 OpenClaw Bridge 对 GPT-5.4 的流式响应转换，避免 `holysheep/gpt-5.4` 在 OpenClaw 中报错；同时增强 Dashboard URL 解析，减少安装后浏览器打开黑屏/空白页
- **v1.6.11** — OpenClaw 新增本地 HolySheep Bridge，统一暴露单一 `holysheep` provider 以支持自由切换 GPT / Claude / MiniMax；同时保留用户所选默认模型，不再强制 GPT-5.4 作为 primary
- **v1.6.10** — 将可运行的 OpenClaw runtime（含 npx 回退）视为已安装，避免 Windows/Node 环境下重复提示安装；同时修复 Droid CLI 的 GPT `/v1` 接入地址并同步写入 `~/.factory/config.json`
- **v1.6.9** — 保留 OpenClaw 的 MiniMax 配置，并为 MiniMax 使用独立 provider id，避免与 Claude provider 冲突；在 OpenClaw 2026.3.13 下改为提示精确 `/model` 切换命令，而不是停止配置 MiniMax
- **v1.6.8** — 修复 Codex 重复写入 `config.toml` 导致的 duplicate key，并修复 OpenClaw 在 Windows 下的安装检测；针对 OpenClaw 2026.3.13 的模型路由回归，临时跳过 MiniMax 避免 `model not allowed`
- **v1.6.7** — OpenClaw 配置新增 `MiniMax-M2.7-highspeed`，并补齐节点迁移脚本中的 SSH 代理账号创建逻辑
- **v1.6.6** — 修复 Droid CLI 的 GPT-5.4 配置残留问题，同时同步 `~/.factory/settings.json` 和 `~/.factory/config.json`，统一使用 `openai + https://api.holysheep.ai/v1`
- **v1.6.5** — 修复 HolySheep 对 Droid Responses API 的兼容
- **v1.6.4** — 修复 OpenClaw 的 npx 运行时检测，避免配置后页面仍卡在 Unauthorized / 未连接状态
- **v1.6.3** — OpenClaw 默认模型改为 GPT-5.4，并继续保留 Claude 模型切换能力
- **v1.6.2** — 修复 OpenClaw 配置误判与 npx 回退，端口冲突时自动切换空闲端口，并补充 Doctor 诊断
- **v1.6.0** — 新增 Droid CLI 一键配置，默认写入 GPT-5.4 / Sonnet 4.6 / Opus 4.6 / MiniMax 2.7 Highspeed / Haiku 4.5
- **v1.5.2** — OpenClaw 安装失败（无 git 环境）时自动降级为 npx 模式继续配置
- **v1.5.0** — OpenClaw gateway 无需 token，直接浏览器打开 http://127.0.0.1:18789/
- **v1.4.6** — 基于实测正确配置格式，彻底修复 OpenClaw 401 认证问题
- **v1.3.x** — OpenClaw 一键配置支持，自动写入配置并启动 Gateway

---

## License

MIT
