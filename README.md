# 🐑 HolySheep CLI

<div align="center">

**[English](#english) | [中文](#chinese)**

[![npm version](https://img.shields.io/npm/v/@simonyea/holysheep-cli?color=orange&label=npm)](https://www.npmjs.com/package/@simonyea/holysheep-cli)
[![npm downloads](https://img.shields.io/npm/dm/@simonyea/holysheep-cli?color=blue)](https://www.npmjs.com/package/@simonyea/holysheep-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/holysheep123/holysheep-cli?style=social)](https://github.com/holysheep123/holysheep-cli)

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
| [OpenClaw](https://github.com/openclaw/openclaw) | `~/.openclaw/openclaw.json` | ✅ Auto |
| [Cursor](https://cursor.sh) | GUI (encrypted storage) | ⚠️ Manual |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google protocol only | ❌ Not supported |

> **Cursor**: API keys are stored in encrypted secret storage. Configure manually via `Settings → Models → Override OpenAI Base URL`.
>
> **Gemini CLI**: Uses Google's proprietary protocol and does not support custom relay endpoints.

### Quick Start

```bash
npx @simonyea/holysheep-cli@latest setup
```

Or install globally:

```bash
npm install -g @simonyea/holysheep-cli
hs setup
```

You'll be prompted for your API Key (`cr_xxx`), then the tool will auto-detect installed AI tools and configure them all.

### Commands

| Command | Description |
|---------|-------------|
| `hs setup` | Configure all AI tools interactively |
| `hs login` | Save your API Key locally |
| `hs doctor` | Check configuration status & connectivity |
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

不用再逐个工具手动改配置文件和环境变量，运行一条命令全部搞定。

### 支持的工具

| 工具 | 配置文件 | 状态 |
|------|---------|------|
| [Claude Code](https://docs.anthropic.com/claude-code) | `~/.claude/settings.json` | ✅ 自动 |
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/config.toml` | ✅ 自动 |
| [Aider](https://aider.chat) | `~/.aider.conf.yml` | ✅ 自动 |
| [Continue.dev](https://continue.dev) | `~/.continue/config.yaml` | ✅ 自动 |
| [OpenCode](https://github.com/anomalyco/opencode) | `~/.config/opencode/opencode.json` | ✅ 自动 |
| [OpenClaw](https://github.com/openclaw/openclaw) | `~/.openclaw/openclaw.json` | ✅ 自动 |
| [Cursor](https://cursor.sh) | GUI（加密存储） | ⚠️ 手动 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | 仅支持 Google 官方协议 | ❌ 不支持 |

> **Cursor**：API Key 存储在加密区域，CLI 无法写入。登录后在 `Settings → Models → Override OpenAI Base URL` 手动填入。
>
> **Gemini CLI**：使用 Google 专有协议，不支持自定义中转地址。

### 快速开始

```bash
npx @simonyea/holysheep-cli@latest setup
```

或全局安装：

```bash
npm install -g @simonyea/holysheep-cli
hs setup
```

按提示输入 API Key（`cr_xxx`），工具会自动检测已安装的 AI 工具并完成配置。

### 命令说明

| 命令 | 说明 |
|------|------|
| `hs setup` | 交互式配置所有 AI 工具 |
| `hs login` | 登录并保存 API Key 到本地 |
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

**Q: 如何恢复原来的配置？**  
A: 运行 `hs reset` 清除所有 HolySheep 相关配置。

**Q: OpenClaw 安装失败？**  
A: OpenClaw 需要 Node.js 22+，运行 `node --version` 确认版本后重试。

---

## License

MIT
