# 🐑 HolySheep CLI

> 一键配置所有 AI 编程工具接入 HolySheep API — 国内直连，¥1=$1，无需魔法

[![npm version](https://img.shields.io/npm/v/holysheep-cli)](https://www.npmjs.com/package/holysheep-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://github.com/holysheep-ai/cli)

**HolySheep CLI** 让你用一条命令，把 Claude Code、Codex、Gemini CLI、OpenCode、OpenClaw、Aider、Cursor、Continue.dev 全部接入 [HolySheep API](https://shop.holysheep.ai)。

无需逐个工具手动配置环境变量和配置文件，一键搞定。

---

## 安装

```bash
npm install -g holysheep-cli
```

或者无需安装直接运行：

```bash
npx holysheep-cli setup
```

---

## 快速开始

### 第一步：注册账号，获取 API Key

前往 **[shop.holysheep.ai](https://shop.holysheep.ai)** 注册账号，充值后在「API 密钥」页面创建 `cr_xxx` 格式的密钥。

> 💡 ¥1 = $1 美元额度，余额永久有效，按量计费

### 第二步：一键配置

```bash
hs setup
```

按提示选择要配置的工具，输入 API Key，完成！

```
🐑  HolySheep CLI — 一键配置 AI 工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
? API Key (cr_xxx): cr_xxxxxxxxxxxxxxxx
? 选择要配置的工具:
  ✅ Claude Code    (已安装)
  ✅ Gemini CLI     (已安装)
  ○  Codex CLI      (未安装)
  ○  Aider          (未安装)

✓ Claude Code   → ~/.claude/settings.json  (热切换，无需重启)
✓ Gemini CLI    → ~/.gemini/settings.json
✓ 环境变量已写入: ~/.zshrc

✅ 配置完成！
```

---

## 命令

| 命令 | 说明 |
|------|------|
| `hs setup` | 一键配置所有 AI 工具 |
| `hs doctor` | 检查配置状态和连通性 |
| `hs balance` | 查看账户余额和用量 |
| `hs tools` | 列出所有支持的工具 |
| `hs reset` | 清除所有配置，恢复默认 |

---

## 支持的工具

| 工具 | 安装方式 | 配置方式 | 热切换 |
|------|---------|---------|-------|
| **[Claude Code](https://docs.anthropic.com/claude-code)** | `npm i -g @anthropic-ai/claude-code` | `~/.claude/settings.json` | ✅ |
| **[Codex CLI](https://github.com/openai/codex)** | `npm i -g @openai/codex` | `~/.codex/config.yaml` + 环境变量 | — |
| **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** | `npm i -g @google/gemini-cli` | `~/.gemini/settings.json` | — |
| **[OpenCode](https://github.com/sst/opencode)** | `npm i -g opencode-ai` | `~/.config/opencode/config.json` | — |
| **[OpenClaw](https://github.com/iOfficeAI/AionUi)** | 官网下载 | `~/.openclaw/settings.json` | ✅ |
| **[Aider](https://aider.chat)** | `pip install aider-chat` | `~/.aider.conf.yml` + 环境变量 | — |
| **[Cursor](https://cursor.sh)** | 官网下载 | GUI 配置引导 | — |
| **[Continue.dev](https://continue.dev)** | VS Code 插件市场 | `~/.continue/config.json` | ✅ |

---

## 接入信息

| 用途 | 地址 |
|------|------|
| Anthropic SDK / Claude Code | `https://api.holysheep.ai` （不带 /v1） |
| OpenAI 兼容 / Codex / Aider | `https://api.holysheep.ai/v1` （带 /v1） |

---

## 手动配置参考

如果你不想用 CLI，也可以手动配置：

### Claude Code
```bash
# ~/.claude/settings.json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "cr_xxx",
    "ANTHROPIC_BASE_URL": "https://api.holysheep.ai"
  }
}
```

### 环境变量（适用于所有工具）
```bash
export ANTHROPIC_API_KEY="cr_xxx"
export ANTHROPIC_BASE_URL="https://api.holysheep.ai"
export OPENAI_API_KEY="cr_xxx"
export OPENAI_BASE_URL="https://api.holysheep.ai/v1"
```

### Codex CLI (`~/.codex/config.yaml`)
```yaml
providers:
  - name: HolySheep
    baseURL: https://api.holysheep.ai/v1
    envKey: OPENAI_API_KEY
model: claude-sonnet-4-5
```

### Aider
```bash
aider --openai-api-base https://api.holysheep.ai/v1 \
      --openai-api-key cr_xxx \
      --model openai/claude-sonnet-4-5
```

---

## 常见问题

**Q: 支持哪些模型？**  
A: 支持 Claude 3.5/3.7 全系、GPT-4o、Gemini 1.5 Pro 等主流模型，详见 [shop.holysheep.ai/app/apikeys](https://shop.holysheep.ai/app/apikeys)

**Q: 国内能直接用吗？**  
A: 能，`api.holysheep.ai` 国内直连，无需代理。

**Q: API Key 格式是什么？**  
A: `cr_` 开头的字符串，在控制台「API 密钥」页面创建。

**Q: 和官方 API 有什么区别？**  
A: 直接对接官方 API，无任何阉割，汇率 ¥1=$1 全网最优。

---

## License

MIT © [HolySheep](https://shop.holysheep.ai)
