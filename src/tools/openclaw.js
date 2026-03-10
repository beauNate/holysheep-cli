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
 * HolySheep 接入方式：
 *   1. 直接写入完整的 openclaw.json（含 auth profile + gateway + 默认模型）
 *   2. 自动启动 Gateway，用户直接打开 http://127.0.0.1:18789/
 *   不需要用户手动跑 onboard / gateway start
 */
const fs            = require('fs')
const path          = require('path')
const os            = require('os')
const crypto        = require('crypto')
const { spawnSync } = require('child_process')

const OPENCLAW_DIR  = path.join(os.homedir(), '.openclaw')
const CONFIG_FILE   = path.join(OPENCLAW_DIR, 'openclaw.json')

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      // openclaw.json 是 JSON5 格式，先去掉注释再 parse
      return JSON.parse(raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))
    }
  } catch {}
  return {}
}

function writeConfig(data) {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
}

/** 生成随机 Gateway token */
function genToken() {
  return crypto.randomBytes(24).toString('hex')
}

/**
 * 构建完整的初始化配置
 * 包含：auth profile（HolySheep Anthropic-compatible）+ gateway + 默认模型 + holysheep provider
 */
function buildFullConfig(existing, apiKey, baseUrlAnthropicNoV1, baseUrlOpenAI) {
  const config = JSON.parse(JSON.stringify(existing || {}))  // deep clone

  // ── 1. 环境变量（兼容 Anthropic SDK 自动读取）──────────────────────
  if (!config.env) config.env = {}
  config.env.ANTHROPIC_API_KEY  = apiKey
  config.env.ANTHROPIC_BASE_URL = baseUrlAnthropicNoV1   // https://api.holysheep.ai

  // ── 2. Auth profile — openclaw 官方格式（Anthropic API key）─────────
  // 参考: docs.openclaw.ai — auth profile type=anthropic-api-key
  if (!config.auth) config.auth = {}
  if (!config.auth.profiles) config.auth.profiles = {}
  config.auth.profiles.holysheep = {
    provider: 'anthropic',
    key:      apiKey,
    baseUrl:  baseUrlAnthropicNoV1,
  }
  // 不设 auth.default — openclaw 不认识这个字段

  // ── 3. 默认模型 ────────────────────────────────────────────────────
  if (!config.agents) config.agents = {}
  if (!config.agents.defaults) config.agents.defaults = {}
  // 总是覆写为 HolySheep 最新 Sonnet 4.6
  config.agents.defaults.model = {
    primary: 'anthropic/claude-sonnet-4-6',
  }

  // ── 4. 自定义 holysheep provider（OpenAI-compatible，支持所有模型）
  if (!config.models) config.models = {}
  config.models.mode = 'merge'
  if (!config.models.providers) config.models.providers = {}
  config.models.providers.holysheep = {
    baseUrl: baseUrlOpenAI,   // https://api.holysheep.ai/v1
    apiKey,
    api:     'openai-completions',
    models: [
      { id: 'claude-sonnet-4-6',          name: 'Claude Sonnet 4.6 (HolySheep)' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (HolySheep)' },
      { id: 'claude-sonnet-4-20250514',   name: 'Claude Sonnet 4 (HolySheep)'   },
      { id: 'claude-opus-4-5-20251101',   name: 'Claude Opus 4.5 (HolySheep)'   },
      { id: 'claude-opus-4-20250514',     name: 'Claude Opus 4 (HolySheep)'     },
      { id: 'gpt-4o',                     name: 'GPT-4o (HolySheep)'            },
      { id: 'gemini-2.5-pro',             name: 'Gemini 2.5 Pro (HolySheep)'    },
    ],
  }

  // ── 5. Gateway 配置（使用 openclaw 2026+ 格式）──────────────────────
  if (!config.gateway) config.gateway = {}
  if (!config.gateway.port) config.gateway.port = 18789
  // bind 用新格式的 mode，不用 IP 字符串
  if (!config.gateway.bind || config.gateway.bind === '127.0.0.1' || config.gateway.bind === 'localhost') {
    config.gateway.bind = 'loopback'
  }
  // 生成 gateway token（若已有则不覆盖）
  if (!config.gateway.auth) config.gateway.auth = {}
  if (!config.gateway.auth.token) {
    config.gateway.auth.token = genToken()
    config.gateway.auth.mode  = 'token'
  }

  // ── 6. 不写 workspace 字段（openclaw 不认识，会报 unknown key）──────
  delete config.workspace

  return config
}

module.exports = {
  name: 'OpenClaw',
  id:   'openclaw',

  checkInstalled() {
    if (require('../utils/which').commandExists('openclaw')) return true
    // Windows PATH 未刷新时，用 npx 探测
    if (process.platform === 'win32') {
      try {
        require('child_process').execSync('npx openclaw --version', { stdio: 'ignore', timeout: 10000 })
        return true
      } catch {}
    }
    return false
  },

  isConfigured() {
    const c = readConfig()
    return !!(
      c.auth?.profiles?.holysheep ||
      c.env?.ANTHROPIC_BASE_URL?.includes('holysheep')
    )
  },

  configure(apiKey, baseUrlAnthropicNoV1, baseUrlOpenAI) {
    const existing = readConfig()
    const config   = buildFullConfig(existing, apiKey, baseUrlAnthropicNoV1, baseUrlOpenAI)

    // 确保 workspace 目录存在（openclaw 首次启动需要）
    fs.mkdirSync(config.workspace, { recursive: true })

    writeConfig(config)

    // 自动初始化并启动 Gateway
    _initAndStartGateway()

    return { file: CONFIG_FILE, hot: false, _gatewayStarted: true }
  },

  reset() {
    const config = readConfig()
    if (config.env) {
      delete config.env.ANTHROPIC_API_KEY
      delete config.env.ANTHROPIC_BASE_URL
    }
    if (config.auth?.profiles) delete config.auth.profiles.holysheep
    if (config.auth?.default === 'holysheep') delete config.auth.default
    if (config.models?.providers) delete config.models.providers.holysheep
    if (config.agents?.defaults?.model?.primary?.startsWith('anthropic/')) {
      delete config.agents.defaults.model
    }
    writeConfig(config)
  },

  getConfigPath() { return CONFIG_FILE },
  hint:      'Gateway 已自动在后台启动，打开浏览器即可使用',
  launchCmd:  null,
  get launchNote() {
    const isWin = process.platform === 'win32'
    return isWin
      ? '🌐 打开浏览器访问 http://127.0.0.1:18789/\n    如无法访问请运行: npx openclaw gateway start'
      : '🌐 打开浏览器访问 http://127.0.0.1:18789/'
  },
  installCmd: 'npm install -g openclaw@latest',
  docsUrl:    'https://docs.openclaw.ai',
}

/**
 * 自动初始化并启动 OpenClaw Gateway
 *
 * 策略：
 *   1. openclaw onboard --non-interactive --install-daemon
 *      读取已写好的 openclaw.json，无交互完成初始化 + 注册系统服务 + 启动 gateway
 *   2. 若 onboard 失败（如 Windows 不支持 daemon），直接 gateway start
 *   3. 仍失败 → Windows: start /B openclaw gateway；Unix: detached spawn
 */
function _initAndStartGateway() {
  const chalk = require('chalk')
  const isWin = process.platform === 'win32'
  // Windows 刚装完 npm 包，PATH 未刷新，用 npx 兜底
  const bin   = isWin ? 'npx openclaw' : 'openclaw'

  console.log(chalk.gray('\n  ⚙️  正在启动 OpenClaw Gateway...'))

  // Step 0: 先 doctor --fix 修复配置兼容性问题
  spawnSync(isWin ? 'npx' : bin,
    isWin ? ['openclaw', 'doctor', '--fix'] : ['doctor', '--fix'],
    { shell: true, timeout: 15000, stdio: 'ignore' }
  )

  // Step 1: gateway start（已有 daemon 时直接生效）
  const r1 = spawnSync(
    isWin ? 'npx' : bin,
    isWin ? ['openclaw', 'gateway', 'start'] : ['gateway', 'start'],
    { shell: true, timeout: 10000, stdio: 'pipe' }
  )
  if (r1.status === 0) {
    console.log(chalk.green('  ✓ OpenClaw Gateway 已启动'))
    console.log(chalk.cyan('  → 浏览器打开: http://127.0.0.1:18789/'))
    return
  }

  // Step 2: 安装系统服务 + 启动
  console.log(chalk.gray('  → 注册系统服务...'))
  spawnSync(
    isWin ? 'npx' : bin,
    isWin ? ['openclaw', 'gateway', 'install'] : ['gateway', 'install'],
    { shell: true, timeout: 30000, stdio: 'ignore' }
  )
  const r3 = spawnSync(
    isWin ? 'npx' : bin,
    isWin ? ['openclaw', 'gateway', 'start'] : ['gateway', 'start'],
    { shell: true, timeout: 10000, stdio: 'pipe' }
  )
  if (r3.status === 0) {
    console.log(chalk.green('  ✓ OpenClaw Gateway 已启动'))
    console.log(chalk.cyan('  → 浏览器打开: http://127.0.0.1:18789/'))
    return
  }

  // Step 3: fallback — 直接后台运行进程
  console.log(chalk.gray('  → 以守护进程模式启动...'))
  if (isWin) {
    // Windows: PowerShell Start-Process 后台运行（用 npx 兜底 PATH 未刷新）
    spawnSync('powershell', [
      '-NonInteractive', '-WindowStyle', 'Hidden', '-Command',
      `Start-Process -FilePath "npx" -ArgumentList "openclaw","gateway","--port","18789" -WindowStyle Hidden`
    ], { shell: false, timeout: 5000, stdio: 'ignore' })
  } else {
    const { spawn } = require('child_process')
    const child = spawn(bin, ['gateway', '--port', '18789'], {
      detached: true, stdio: 'ignore',
    })
    child.unref()
  }

  // 等 4 秒让 gateway 起来再报告
  const deadline = Date.now() + 4000
  while (Date.now() < deadline) {}

  // 验证是否真的起来了
  const http = require('http')
  const verify = new Promise(resolve => {
    const req = http.get('http://127.0.0.1:18789/', res => resolve(true))
    req.on('error', () => resolve(false))
    req.setTimeout(3000, () => { req.destroy(); resolve(false) })
  })

  // 用同步方式等验证（node 18+）
  let ok = false
  try {
    const { execSync } = require('child_process')
    execSync(
      isWin
        ? 'powershell -NonInteractive -Command "Invoke-WebRequest -Uri http://127.0.0.1:18789/ -TimeoutSec 3 -UseBasicParsing | Out-Null"'
        : 'curl -sf http://127.0.0.1:18789/ -o /dev/null --max-time 3',
      { stdio: 'ignore', timeout: 5000 }
    )
    ok = true
  } catch {}

  if (ok) {
    console.log(chalk.green('  ✓ OpenClaw Gateway 已启动'))
    console.log(chalk.cyan('  → 浏览器打开: http://127.0.0.1:18789/'))
  } else {
    console.log(chalk.yellow('  ⚠️  Gateway 启动中，请稍等 10 秒后访问:'))
    console.log(chalk.cyan('  → http://127.0.0.1:18789/'))
    console.log(chalk.gray('  如仍无法访问，请手动运行: openclaw gateway start'))
  }
}
