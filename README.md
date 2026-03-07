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

[🚀 Get Started](#quick-start) · [📦 npm](https://www.npmjs.com/package/@simonyea/holysheep-cli) · [🐑 HolySheep](https://shop.holysheep.ai)

</div>

---

<a name="english"></a>

## 🇬🇧 English

### What is HolySheep CLI?

**HolySheep CLI** (`hs`) is a command-line tool that automatically configures all popular AI coding assistants to use [HolySheep API](https://shop.holysheep.ai) — a relay service that lets developers in China access Claude, GPT, and Gemini APIs **without a VPN**, at **¥1 = $1** exchange rate.

Instead of manually editing config files and environment variables for each tool, just run `hs setup` and you're done.

### Supported Tools

| Tool | Install | Config Method | Hot Reload |
|------|---------|---------------|-----------|
| [Claude Code](https://docs.anthropic.com/claude-code) | `npm i -g @anthropic-ai/claude-code` | `~/.claude/settings.json` | ✅ |
| [Codex CLI](https://github.com/openai/codex) | `npm i -g @openai/codex` | `~/.codex/config.yaml` | — |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm i -g @google/gemini-cli` | `~/.gemini/settings.json` | — |
| [OpenCode](https://github.com/sst/opencode) | `npm i -g opencode-ai` | `~/.config/opencode/config.json` | — |
| [OpenClaw](https://github.com/iOfficeAI/AionUi) | Download from website | `~/.openclaw/settings.json` | ✅ |
| [Aider](https://aider.chat) | `pip install aider-chat` | `~/.aider.conf.yml` | — |
| [Cursor](https://cursor.sh) | Download from website | GUI guided setup | — |
| [Continue.dev](https://continue.dev) | VS Code marketplace | `~/.continue/config.json` | ✅ |

### Installation

```bash
npm install -g @simonyea/holysheep-cli
```

No npm? Try npx (no install needed):

```bash
npx @simonyea/holysheep-cli setup
```

### Quick Start

**Step 1** — Sign up at **[shop.holysheep.ai](https://shop.holysheep.ai)** and get your API Key (`cr_xxx`)

**Step 2** — Run setup:

```bash
hs setup
```

```
🐑  HolySheep CLI — Configure AI Tools
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
? API Key (cr_xxx): cr_xxxxxxxxxxxxxxxx
? Select tools to configure:
  ✅ ● Claude Code    (installed)
  ✅ ● Gemini CLI     (installed)
  ○  Codex CLI        (not installed)
  ○  Aider            (not installed)

✓ Claude Code   → ~/.claude/settings.json  (hot reload, no restart needed)
✓ Gemini CLI    → ~/.gemini/settings.json
✓ Env vars written to ~/.zshrc

✅ Done! All tools configured.
```

### Commands

| Command | Description |
|---------|-------------|
| `hs setup` | Configure all AI tools interactively |
| `hs doctor` | Check configuration status & connectivity |
| `hs balance` | View account balance and usage |
| `hs tools` | List all supported tools |
| `hs reset` | Remove all HolySheep configuration |

### API Endpoints

| Usage | URL |
|-------|-----|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai` (no `/v1`) |
| OpenAI-compatible / Codex / Aider | `https://api.holysheep.ai/v1` (with `/v1`) |

### Why HolySheep?

- 🇨🇳 **China-accessible** — Direct connection, no VPN needed
- 💰 **Best rate** — ¥1 = $1, balance never expires, pay-as-you-go
- ⚡ **All major models** — Claude 3.5/3.7, GPT-4o, Gemini 1.5 Pro and more
- 🔒 **Official relay** — Direct passthrough to official APIs, no censorship

---

<a name="chinese"></a>

## 🇨🇳 中文

### 什么是 HolySheep CLI？

**HolySheep CLI**（命令 `hs`）是一个命令行工具，帮你一键配置所有主流 AI 编程助手接入 [HolySheep API](https://shop.holysheep.ai)。

HolySheep 是面向中国开发者的 Claude/GPT/Gemini 官方 API 中转服务，**国内直连、无需翻墙、¥1=$1**。

不用再逐个工具手动改配置文件和环境变量，执行 `hs setup` 一步搞定。

### 支持的工具

| 工具 | 安装方式 | 配置方式 | 热切换 |
|------|---------|---------|-------|
| [Claude Code](https://docs.anthropic.com/claude-code) | `npm i -g @anthropic-ai/claude-code` | `~/.claude/settings.json` | ✅ |
| [Codex CLI](https://github.com/openai/codex) | `npm i -g @openai/codex` | `~/.codex/config.yaml` | — |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm i -g @google/gemini-cli` | `~/.gemini/settings.json` | — |
| [OpenCode](https://github.com/sst/opencode) | `npm i -g opencode-ai` | `~/.config/opencode/config.json` | — |
| [OpenClaw](https://github.com/iOfficeAI/AionUi) | 官网下载 | `~/.openclaw/settings.json` | ✅ |
| [Aider](https://aider.chat) | `pip install aider-chat` | `~/.aider.conf.yml` | — |
| [Cursor](https://cursor.sh) | 官网下载 | 引导式 GUI 配置 | — |
| [Continue.dev](https://continue.dev) | VS Code 插件市场 | `~/.continue/config.json` | ✅ |

### 安装

```bash
npm install -g @simonyea/holysheep-cli
```

没有 npm？用 npx 免安装直接运行：

```bash
npx @simonyea/holysheep-cli setup
```

### 快速开始

**第一步** — 前往 **[shop.holysheep.ai](https://shop.holysheep.ai)** 注册账号，充值后创建 API Key（`cr_` 开头）

**第二步** — 运行配置向导：

```bash
hs setup
```

```
🐑  HolySheep CLI — 一键配置 AI 工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
? API Key (cr_xxx): cr_xxxxxxxxxxxxxxxx
? 选择要配置的工具：
  ✅ ● Claude Code    (已安装)
  ✅ ● Gemini CLI     (已安装)
  ○  Codex CLI        (未安装)
  ○  Aider            (未安装)

✓ Claude Code   → ~/.claude/settings.json  (热切换，无需重启)
✓ Gemini CLI    → ~/.gemini/settings.json
✓ 环境变量已写入 ~/.zshrc

✅ 配置完成！
```

### 命令说明

| 命令 | 说明 |
|------|------|
| `hs setup` | 交互式配置所有 AI 工具 |
| `hs doctor` | 检查配置状态和连通性 |
| `hs balance` | 查看账户余额和用量 |
| `hs tools` | 列出所有支持的工具 |
| `hs reset` | 清除所有 HolySheep 配置 |

### 接入地址

| 用途 | 地址 |
|------|------|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai`（不带 /v1） |
| OpenAI 兼容 / Codex / Aider | `https://api.holysheep.ai/v1`（带 /v1） |

### 为什么选 HolySheep？

- 🇨🇳 **国内直连** — 无需代理，开箱即用
- 💰 **全网最优汇率** — ¥1=$1，余额永久有效，按量计费
- ⚡ **全主流模型** — Claude 3.5/3.7、GPT-4o、Gemini 1.5 Pro 等
- 🔒 **官方直转** — 直连官方 API，无任何阉割

### 常见问题

**Q: API Key 格式是什么？**  
A: `cr_` 开头的字符串，在 [shop.holysheep.ai](https://shop.holysheep.ai) 控制台「API 密钥」页面创建。

**Q: 支持 Windows 吗？**  
A: 支持，需要 Node.js 16+。环境变量会写入用户目录下的 shell 配置文件。

**Q: 如何恢复原来的配置？**  
A: 运行 `hs reset` 即可清除所有 HolySheep 相关配置。

---

## License

MIT © [HolySheep](https://shop.holysheep.ai)
