/**
 * OpenClaw 适配器 (github.com/openclaw/openclaw)
 *
 * OpenClaw 是个人 AI 助手 + 多渠道消息网关
 * 支持 WhatsApp/Telegram/Signal/Discord/iMessage 等 20+ 渠道
 *
 * 安装方式: npm install -g openclaw@latest
 * 配置文件: ~/.openclaw/openclaw.json (JSON5 格式)
 * 文档: https://docs.openclaw.ai
 *
 * HolySheep 接入方式：通过 env.ANTHROPIC_API_KEY + env.ANTHROPIC_BASE_URL
 * 设置 Anthropic provider 自定义 base URL 指向 HolySheep 中继
 */
const fs           = require('fs')
const path         = require('path')
const os           = require('os')
const { spawnSync } = require('child_process')

const OPENCLAW_DIR   = path.join(os.homedir(), '.openclaw')
const CONFIG_FILE    = path.join(OPENCLAW_DIR, 'openclaw.json')

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      // openclaw.json 是 JSON5 格式，先去掉注释再 parse
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      return JSON.parse(raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))
    }
  } catch {}
  return {}
}

function writeConfig(data) {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
}

module.exports = {
  name: 'OpenClaw',
  id: 'openclaw',
  checkInstalled() {
    return require('../utils/which').commandExists('openclaw')
  },
  isConfigured() {
    const c = readConfig()
    return !!(
      c.env?.ANTHROPIC_BASE_URL?.includes('holysheep') ||
      c.models?.providers?.holysheep
    )
  },
  configure(apiKey, baseUrlAnthropicNoV1, baseUrlOpenAI) {
    const config = readConfig()

    // 设置环境变量 — Anthropic provider 使用 ANTHROPIC_BASE_URL 覆盖默认地址
    if (!config.env) config.env = {}
    config.env.ANTHROPIC_API_KEY  = apiKey
    config.env.ANTHROPIC_BASE_URL = baseUrlAnthropicNoV1  // https://api.holysheep.ai

    // 设置默认模型（如果未配置）
    if (!config.agents) config.agents = {}
    if (!config.agents.defaults) config.agents.defaults = {}
    if (!config.agents.defaults.model) {
      config.agents.defaults.model = { primary: 'anthropic/claude-sonnet-4-5-20250929' }
    }

    // 同时注册一个 holysheep 自定义 provider（支持所有模型）
    if (!config.models) config.models = {}
    config.models.mode = 'merge'
    if (!config.models.providers) config.models.providers = {}
    config.models.providers.holysheep = {
      baseUrl: baseUrlOpenAI,  // https://api.holysheep.ai/v1
      apiKey,
      api: 'openai-completions',
      models: [
        { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (HolySheep)' },
        { id: 'claude-sonnet-4-20250514',   name: 'Claude Sonnet 4 (HolySheep)'   },
        { id: 'claude-opus-4-5-20251101',   name: 'Claude Opus 4.5 (HolySheep)'   },
        { id: 'claude-opus-4-20250514',     name: 'Claude Opus 4 (HolySheep)'     },
        { id: 'gpt-4o',                     name: 'GPT-4o (HolySheep)'            },
        { id: 'gemini-2.5-pro',             name: 'Gemini 2.5 Pro (HolySheep)'    },
      ],
    }

    writeConfig(config)

    // 自动启动 Gateway 后台服务（无需用户手动操作）
    // 先尝试安装 daemon（系统服务），再 start；失败不阻断配置流程
    _autoStartGateway()

    return { file: CONFIG_FILE, hot: false, _gatewayStarted: true }
  },
  reset() {
    const config = readConfig()
    if (config.env) {
      delete config.env.ANTHROPIC_API_KEY
      delete config.env.ANTHROPIC_BASE_URL
    }
    if (config.models?.providers) {
      delete config.models.providers.holysheep
    }
    // 如果默认模型是 anthropic/xxx，清掉
    if (config.agents?.defaults?.model?.primary?.startsWith('anthropic/')) {
      delete config.agents.defaults.model
    }
    writeConfig(config)
  },
  getConfigPath() { return CONFIG_FILE },
  hint: 'Gateway 已自动启动，浏览器打开 http://127.0.0.1:18789/ 即可使用',
  launchCmd: null,
  launchNote: '🌐 打开浏览器访问 http://127.0.0.1:18789/',
  installCmd: 'npm install -g openclaw@latest',
  docsUrl: 'https://docs.openclaw.ai',
}

/**
 * 自动启动 OpenClaw Gateway 后台服务
 * 1. 先尝试 `openclaw gateway start`（已有 daemon 或上次安装过）
 * 2. 若失败，尝试 `openclaw onboard --install-daemon --yes`（无交互，自动安装系统服务）
 * 3. 再 `openclaw gateway start`
 */
function _autoStartGateway() {
  const chalk = require('chalk')
  const bin = process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw'

  console.log(chalk.gray('\n  ⚙️  正在启动 OpenClaw Gateway...'))

  // 先直接 start
  const r1 = spawnSync(bin, ['gateway', 'start'], { shell: true, timeout: 15000 })
  if (r1.status === 0) {
    console.log(chalk.green('  ✓ OpenClaw Gateway 已在后台启动'))
    return
  }

  // start 失败 → 先 onboard --install-daemon --yes（无交互）再 start
  console.log(chalk.gray('  → 首次运行，正在初始化服务（约 10 秒）...'))
  spawnSync(bin, ['onboard', '--install-daemon', '--yes'], {
    shell: true,
    timeout: 60000,
    stdio: 'ignore',
  })

  const r2 = spawnSync(bin, ['gateway', 'start'], { shell: true, timeout: 15000 })
  if (r2.status === 0) {
    console.log(chalk.green('  ✓ OpenClaw Gateway 已在后台启动'))
  } else {
    // 仍然失败 → fallback：前台静默运行（detached）
    const { spawn } = require('child_process')
    const child = spawn(bin, ['gateway'], {
      shell: true,
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    console.log(chalk.green('  ✓ OpenClaw Gateway 已启动（前台守护模式）'))
  }
}
