# 🐑 HolySheep CLI

<div align="center">

**[English](#english) | [中文](#chinese)**

[![npm version](https://img.shields.io/npm/v/@simonyea/holysheep-cli?color=orange&label=npm)](https://www.npmjs.com/package/@simonyea/holysheep-cli)
[![npm downloads](https://img.shields.io/npm/dm/@simonyea/holysheep-cli?color=blue)](https://www.npmjs.com/package/@simonyea/holysheep-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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
| [Aider](https://aider.chat) | `~/.aider.conf.yml` | ✅ Auto |
| [Continue.dev](https://continue.dev) | `~/.continue/config.yaml` | ✅ Auto |
| [OpenCode](https://github.com/anomalyco/opencode) | `~/.config/opencode/opencode.json` | ✅ Auto |
| [OpenClaw](https://openclaw.ai) | `~/.openclaw/openclaw.json` | ✅ Auto |
| [Cursor](https://cursor.sh) | GUI (encrypted storage) | ⚠️ Manual |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google protocol only | ❌ Not supported |

### Quick Start

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

1. A new terminal window opens running the OpenClaw Gateway
2. Open your browser: **http://127.0.0.1:18789/**
3. Start chatting — no token required

> **Keep the gateway window open** while using OpenClaw. The gateway must be running for the browser UI to work.

To restart the gateway later:
```bash
npx openclaw gateway --port 18789
```

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
| [Aider](https://aider.chat) | ✅ 自动 | AI 结对编程 |
| [Continue.dev](https://continue.dev) | ✅ 自动 | VS Code/JetBrains 插件 |
| [OpenCode](https://github.com/anomalyco/opencode) | ✅ 自动 | 终端 AI 编程助手 |
| [OpenClaw](https://openclaw.ai) | ✅ 自动 | AI 智能体网关 + Web 界面 |
| [Cursor](https://cursor.sh) | ⚠️ 手动 | 需在 GUI 中手动配置 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | ❌ 不支持 | 仅支持 Google 官方协议 |

### 快速开始

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

1. 自动弹出一个新终端窗口，运行 OpenClaw Gateway
2. 打开浏览器访问：**http://127.0.0.1:18789/**
3. 直接开始聊天，无需填写 token

> ⚠️ **保持 Gateway 窗口开启**，关闭后 Gateway 停止，浏览器界面无法使用。

**下次启动 Gateway：**
```bash
npx openclaw gateway --port 18789
```

**使用的模型：** `claude-sonnet-4-6`（通过 HolySheep 中转）

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
A: 可以最小化，但不能关闭。关闭后 Gateway 停止，需重新运行 `npx openclaw gateway --port 18789`。

**Q: 如何恢复原来的配置？**  
A: 运行 `hs reset` 清除所有 HolySheep 相关配置。

**Q: OpenClaw 安装失败？**  
A: OpenClaw 需要 Node.js 20+，运行 `node --version` 确认版本后重试。

---

## License

MIT
