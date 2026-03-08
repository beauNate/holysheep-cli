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

[🚀 Get Started](#quick-start) · [📦 npm](https://www.npmjs.com/package/@simonyea/holysheep-cli) · [🐑 HolySheep](https://holysheep.ai)

</div>

---

<a name="english"></a>

## 🇬🇧 English

### What is HolySheep CLI?

**HolySheep CLI** (`hs`) is a command-line tool that automatically configures all popular AI coding assistants to use [HolySheep API](https://holysheep.ai) — a relay service that lets developers in China access Claude, GPT, and Gemini APIs **without a VPN**.

Instead of manually editing config files and environment variables for each tool, just run one command and you're done.

### Supported Tools

| Tool | Install | Config Method | Status |
|------|---------|---------------|--------|
| [Claude Code](https://docs.anthropic.com/claude-code) | `npm i -g @anthropic-ai/claude-code` | `~/.claude/settings.json` | ✅ Auto |
| [Codex CLI](https://github.com/openai/codex) | `npm i -g @openai/codex` | `~/.codex/config.toml` | ✅ Auto |
| [Aider](https://aider.chat) | `pip install aider-install && aider-install` | `~/.aider.conf.yml` | ✅ Auto |
| [Continue.dev](https://continue.dev) | VS Code marketplace | `~/.continue/config.yaml` | ✅ Auto |
| [OpenCode](https://opencode.ai) | `brew install anomalyco/tap/opencode` | `~/.config/opencode/opencode.json` | ✅ Auto |
| [OpenClaw](https://github.com/openclaw/openclaw) | `npm i -g openclaw@latest` | `~/.openclaw/openclaw.json` | ✅ Auto |
| [Cursor](https://cursor.sh) | Download from website | GUI only (encrypted storage) | ⚠️ Manual |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm i -g @google/gemini-cli` | Google protocol only | ❌ Not supported |

> **Cursor**: Requires logging into the official Cursor account. API keys are stored in encrypted secret storage. Configure manually via `Settings → Models → Override OpenAI Base URL`.
>
> **Gemini CLI**: Uses Google's proprietary protocol and does not support custom relay endpoints.

### Quick Start

**No install needed — just run:**

```bash
npx @simonyea/holysheep-cli@latest setup
```

Or install globally first:

```bash
npm install -g @simonyea/holysheep-cli
hs setup
```

**Step 1** — Sign up at **[holysheep.ai](https://holysheep.ai)** and get your API Key (`cr_xxx`)

**Step 2** — Run the setup wizard and follow the prompts. It will auto-detect installed tools, optionally install missing ones, and write all config files automatically.

### Commands

| Command | Description |
|---------|-------------|
| `hs setup` | Configure all AI tools interactively |
| `hs login` | Save your API Key locally |
| `hs doctor` | Check configuration status & connectivity |
| `hs balance` | View account balance and usage |
| `hs tools` | List all supported tools |
| `hs reset` | Remove all HolySheep configuration |

### API Endpoints

| Usage | URL |
|-------|-----|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai` (no `/v1`) |
| OpenAI-compatible / Codex / Aider | `https://api.holysheep.ai/v1` (with `/v1`) |

### Pricing

Pay-as-you-go with tiered rates. **New users get +20% bonus on first recharge.**

| Recharge Amount | Rate | Discount |
|----------------|------|----------|
| $1 – $50 | ¥3 / $1 | ~42% off |
| $51 – $200 | ¥2 / $1 | ~28% off |
| $201 – $500 | ¥1.5 / $1 | ~21% off |
| $501 – $1,000 | ¥1.2 / $1 | ~17% off |
| $1,001+ | ¥1 / $1 | ~14% off |

Balance never expires. See [holysheep.ai/app/pricing](https://holysheep.ai/app/pricing) for full details.

### Why HolySheep?

- 🇨🇳 **China-accessible** — Direct connection, no VPN needed
- 💰 **Tiered pricing** — The more you recharge, the better the rate
- 🎁 **New user bonus** — +20% on your first recharge
- ⚡ **All major models** — Claude Sonnet/Opus, GPT-5, Gemini and more
- 🔒 **Official relay** — Direct passthrough to official APIs, no censorship

---

<a name="chinese"></a>

## 🇨🇳 中文

### 什么是 HolySheep CLI？

**HolySheep CLI**（命令 `hs`）是一个命令行工具，帮你**一键配置**所有主流 AI 编程助手接入 [HolySheep API](https://holysheep.ai)。

HolySheep 是面向中国开发者的 Claude/GPT/Gemini 官方 API 中转服务，**国内直连、无需翻墙**。

不用再逐个工具手动改配置文件和环境变量，一条命令全部搞定。

### 支持的工具

| 工具 | 安装方式 | 配置方式 | 状态 |
|------|---------|---------|------|
| [Claude Code](https://docs.anthropic.com/claude-code) | `npm i -g @anthropic-ai/claude-code` | `~/.claude/settings.json` | ✅ 自动 |
| [Codex CLI](https://github.com/openai/codex) | `npm i -g @openai/codex` | `~/.codex/config.toml` | ✅ 自动 |
| [Aider](https://aider.chat) | `pip install aider-install && aider-install` | `~/.aider.conf.yml` | ✅ 自动 |
| [Continue.dev](https://continue.dev) | VS Code 插件市场 | `~/.continue/config.yaml` | ✅ 自动 |
| [OpenCode](https://opencode.ai) | `brew install anomalyco/tap/opencode` | `~/.config/opencode/opencode.json` | ✅ 自动 |
| [OpenClaw](https://github.com/openclaw/openclaw) | `npm i -g openclaw@latest` | `~/.openclaw/openclaw.json` | ✅ 自动 |
| [Cursor](https://cursor.sh) | 官网下载 | GUI 手动配置（加密存储） | ⚠️ 手动 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm i -g @google/gemini-cli` | 仅支持 Google 官方协议 | ❌ 不支持 |

> **关于 Cursor**：Cursor 新版（2025+）必须登录官方账号，API Key 存储在加密区域，CLI 无法写入。需登录后在 `Settings → Models → Override OpenAI Base URL` 手动填入。
>
> **关于 Gemini CLI**：使用 Google 专有协议，不支持自定义中转地址。需使用自己的 Google Gemini API Key。

### 快速开始

**无需安装，直接运行（推荐）：**

```bash
npx @simonyea/holysheep-cli@latest setup
```

或全局安装后使用：

```bash
npm install -g @simonyea/holysheep-cli
hs setup
```

**第一步** — 前往 **[holysheep.ai](https://holysheep.ai)** 注册账号，获取 API Key（`cr_` 开头）

**第二步** — 运行配置向导，它会自动检测已安装的工具，可选择自动安装缺失工具，并自动写入所有配置文件。

### 命令说明

| 命令 | 说明 |
|------|------|
| `hs setup` | 交互式配置所有 AI 工具 |
| `hs login` | 登录并保存 API Key 到本地 |
| `hs doctor` | 检查配置状态和连通性 |
| `hs balance` | 查看账户余额和用量 |
| `hs tools` | 列出所有支持的工具 |
| `hs reset` | 清除所有 HolySheep 配置 |

### 接入地址

| 用途 | 地址 |
|------|------|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai`（不带 /v1） |
| OpenAI 兼容 / Codex / Aider | `https://api.holysheep.ai/v1`（带 /v1） |

### 充值定价

按量计费，充值越多越划算。**新用户首次充值额外赠送 20%。**

| 充值额度 | 汇率 | 折扣 |
|---------|------|------|
| $1 ~ $50 | ¥3 / $1 | 约4.2折 |
| $51 ~ $200 | ¥2 / $1 | 约2.8折 |
| $201 ~ $500 | ¥1.5 / $1 | 约2.1折 |
| $501 ~ $1,000 | ¥1.2 / $1 | 约1.7折 |
| $1,001 以上 | ¥1 / $1 | 约1.4折 |

余额永久有效，详见 [holysheep.ai/app/pricing](https://holysheep.ai/app/pricing)。

### 推广返佣

邀请好友注册并充值，每次充值你将获得 **10% 返佣**，实时到账，永久有效。

在 [推广中心](https://holysheep.ai/app/invite) 获取你的专属邀请链接。

### 为什么选 HolySheep？

- 🇨🇳 **国内直连** — 无需代理，开箱即用
- 💰 **阶梯优惠** — 充值越多汇率越低，大额最低 ¥1=$1
- 🎁 **新用户礼** — 首充额外赠送 20%
- ⚡ **全主流模型** — Claude Sonnet/Opus、GPT-5、Gemini 等
- 🔒 **官方直转** — 直连官方 API，无任何阉割

### 常见问题

**Q: API Key 格式是什么？**  
A: `cr_` 开头的字符串，在 [holysheep.ai](https://holysheep.ai) 控制台「API 密钥」页面创建。

**Q: 支持 Windows 吗？**  
A: 支持，需要 Node.js 16+。如果 `hs` 命令找不到，请重启终端，或直接用 `npx @simonyea/holysheep-cli@latest setup`。

**Q: 如何恢复原来的配置？**  
A: 运行 `hs reset` 即可清除所有 HolySheep 相关配置。

**Q: OpenClaw 安装失败怎么办？**  
A: 需要 Node.js 22+，运行 `node --version` 确认版本后重试。

---

## License

MIT © [HolySheep](https://holysheep.ai)
