/**
 * OpenClaw 适配器 (v2 — 基于实测的正确配置格式)
 *
 * 正确方案：custom-api-key provider，配置在 models.providers 里
 * provider name 自动生成为 "custom-api-{hostname}"
 * 模型引用格式: "custom-api-holysheep-ai/claude-sonnet-4-6"
 *
 * 必须的 onboard 参数:
 *   --accept-risk --auth-choice custom-api-key
 *   --custom-base-url --custom-api-key --custom-model-id --custom-compatibility anthropic
 *   --install-daemon
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync, spawn, execSync } = require('child_process')
const { commandExists } = require('../utils/which')

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json')
const isWin = process.platform === 'win32'
const DEFAULT_GATEWAY_PORT = 18789
const MAX_PORT_SCAN = 20

function hasOpenClawBinary() {
  return commandExists('openclaw')
}

function hasNpx() {
  return commandExists('npx')
}

function getRunner(preferNpx = false) {
  if (!preferNpx && hasOpenClawBinary()) {
    return { cmd: 'openclaw', argsPrefix: [], shell: false, label: 'openclaw', via: 'binary' }
  }
  if (hasNpx()) {
    return { cmd: 'npx', argsPrefix: ['openclaw'], shell: isWin, label: 'npx openclaw', via: 'npx' }
  }
  if (hasOpenClawBinary()) {
    return { cmd: 'openclaw', argsPrefix: [], shell: false, label: 'openclaw', via: 'binary' }
  }
  return null
}

/** 运行 openclaw CLI（优先全局命令，可切换到 npx 回退） */
function runOpenClaw(args, opts = {}) {
  const runner = getRunner(Boolean(opts.preferNpx))
  if (!runner) {
    return { status: 1, stdout: '', stderr: 'OpenClaw CLI not found' }
  }

  return spawnSync(runner.cmd, [...runner.argsPrefix, ...args], {
    shell: runner.shell,
    timeout: opts.timeout || 30000,
    stdio: opts.stdio || 'pipe',
    encoding: 'utf8',
  })
}

function spawnOpenClaw(args, opts = {}) {
  const runner = getRunner(Boolean(opts.preferNpx))
  if (!runner) throw new Error('OpenClaw CLI not found')

  const { preferNpx: _preferNpx, ...spawnOpts } = opts
  return spawn(runner.cmd, [...runner.argsPrefix, ...args], {
    shell: runner.shell,
    ...spawnOpts,
  })
}

function getPreferredRuntime() {
  return module.exports._useNpx || !hasOpenClawBinary()
}

function firstLine(text) {
  return String(text || '').trim().split('\n')[0] || ''
}

function getOpenClawVersion(preferNpx = false) {
  const result = runOpenClaw(['--version'], { preferNpx, timeout: 15000 })
  if (result.status !== 0) return null
  return firstLine(result.stdout)
}

function detectRuntime() {
  const preferNpx = getPreferredRuntime()
  const version = getOpenClawVersion(preferNpx)

  if (version) {
    const runner = getRunner(preferNpx)
    return {
      available: true,
      via: runner?.via || (preferNpx ? 'npx' : 'binary'),
      command: runner?.label || (preferNpx ? 'npx openclaw' : 'openclaw'),
      version,
    }
  }

  if (!preferNpx && hasNpx()) {
    const fallbackVersion = getOpenClawVersion(true)
    if (fallbackVersion) {
      return {
        available: true,
        via: 'npx',
        command: 'npx openclaw',
        version: fallbackVersion,
      }
    }
  }

  return { available: false, via: null, command: null, version: null }
}

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      try {
        return JSON.parse(raw)
      } catch {
        // 兼容极少数带注释的配置，但不要误伤 https:// 之类的 URL
        return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))
      }
    }
  } catch {}
  return {}
}

function getConfiguredGatewayPort(config = readConfig()) {
  const port = Number(config?.gateway?.port)
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_GATEWAY_PORT
}

function isPortInUse(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { shell: true, stdio: 'pipe', encoding: 'utf8' })
      return out.trim().length > 0
    }

    execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, { shell: true, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function listPortListeners(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { shell: true, stdio: 'pipe', encoding: 'utf8' })
      return out
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const parts = line.trim().split(/\s+/)
          return { pid: parts[parts.length - 1], command: 'pid', detail: parts[1] || '' }
        })
    }

    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, { shell: true, stdio: 'pipe', encoding: 'utf8' })
    return out
      .trim()
      .split('\n')
      .slice(1)
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        return {
          command: parts[0] || 'unknown',
          pid: parts[1] || '?',
          detail: parts[parts.length - 1] || '',
        }
      })
  } catch {
    return []
  }
}

function findAvailableGatewayPort(startPort = DEFAULT_GATEWAY_PORT) {
  for (let offset = 0; offset < MAX_PORT_SCAN; offset++) {
    const port = startPort + offset
    if (!isPortInUse(port)) return port
  }
  return null
}

function getLaunchCommand(port = getConfiguredGatewayPort()) {
  const runtime = module.exports._lastRuntimeCommand || (hasOpenClawBinary() ? 'openclaw' : 'npx openclaw')
  return `${runtime} gateway --port ${port}`
}

function _writeFallbackConfig(apiKey, baseUrl, selectedModels, primaryModel, gatewayPort) {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true })

  const hostname = new URL(baseUrl).hostname.replace(/\./g, '-')
  const providerName = `custom-api-${hostname}`

  const claudeModels = (selectedModels || ['claude-sonnet-4-6'])
    .filter((model) => model.startsWith('claude-'))
  if (claudeModels.length === 0) claudeModels.push('claude-sonnet-4-6')

  const primary = primaryModel || claudeModels[0]

  const config = {
    models: {
      mode: 'merge',
      providers: {
        [providerName]: {
          baseUrl,
          apiKey,
          api: 'anthropic-messages',
          models: claudeModels.map((id) => ({
            id,
            name: `${id} (HolySheep)`,
            reasoning: false,
            input: ['text'],
            contextWindow: 200000,
            maxTokens: 16000,
          })),
        },
      },
    },
    agents: {
      defaults: {
        model: { primary: `${providerName}/${primary}` },
      },
    },
    gateway: {
      mode: 'local',
      port: gatewayPort,
      bind: 'loopback',
      auth: { mode: 'none' },
    },
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
}

function _disableGatewayAuth(preferNpx = false) {
  try {
    runOpenClaw(['config', 'set', 'gateway.auth.mode', 'none'], { preferNpx })
  } catch {}
}

function _setGatewayPort(port, preferNpx = false) {
  try {
    runOpenClaw(['config', 'set', 'gateway.port', String(port)], { preferNpx })
    runOpenClaw(['config', 'set', 'gateway.bind', 'loopback'], { preferNpx })
  } catch {}
}

function _installGatewayService(port, preferNpx = false) {
  const result = runOpenClaw(['gateway', 'install', '--force', '--port', String(port)], {
    preferNpx,
    timeout: 60000,
  })
  return result.status === 0
}

function _startGateway(port, preferNpx = false, preferService = true) {
  const serviceResult = preferService
    ? runOpenClaw(['gateway', 'start'], { preferNpx, timeout: 20000 })
    : { status: 1 }

  if (serviceResult.status !== 0) {
    const child = spawnOpenClaw(['gateway', '--port', String(port)], {
      preferNpx,
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
  }

  for (let i = 0; i < 8; i++) {
    const t0 = Date.now()
    while (Date.now() - t0 < 1000) {}

    try {
      execSync(
        isWin
          ? `powershell -NonInteractive -Command "try{(Invoke-WebRequest -Uri http://127.0.0.1:${port}/ -TimeoutSec 1 -UseBasicParsing).StatusCode}catch{exit 1}"`
          : `curl -sf http://127.0.0.1:${port}/ -o /dev/null --max-time 1`,
        { stdio: 'ignore', timeout: 3000 }
      )
      return true
    } catch {}
  }

  return false
}

module.exports = {
  name: 'OpenClaw',
  id: 'openclaw',

  checkInstalled() {
    return hasOpenClawBinary()
  },

  detectRuntime,

  getVersion() {
    return detectRuntime().version
  },

  isConfigured() {
    const cfg = JSON.stringify(readConfig())
    return cfg.includes('holysheep.ai')
  },

  configure(apiKey, baseUrl, _baseUrlOpenAI, primaryModel, selectedModels) {
    const chalk = require('chalk')
    console.log(chalk.gray('\n  ⚙️  正在配置 OpenClaw...'))

    const runtime = detectRuntime()
    if (!runtime.available) {
      throw new Error('未检测到 OpenClaw；请先全局安装，或确保 npx 可用')
    }
    this._lastRuntimeCommand = runtime.command

    runOpenClaw(['gateway', 'stop'], { preferNpx: runtime.via === 'npx' })

    const gatewayPort = findAvailableGatewayPort(DEFAULT_GATEWAY_PORT)
    if (!gatewayPort) {
      throw new Error(`找不到可用端口（已检查 ${DEFAULT_GATEWAY_PORT}-${DEFAULT_GATEWAY_PORT + MAX_PORT_SCAN - 1}）`)
    }
    this._lastGatewayPort = gatewayPort

    if (gatewayPort !== DEFAULT_GATEWAY_PORT) {
      console.log(chalk.yellow(`  ⚠️  端口 ${DEFAULT_GATEWAY_PORT} 已占用，自动切换到 ${gatewayPort}`))
      const listeners = listPortListeners(DEFAULT_GATEWAY_PORT)
      if (listeners.length) {
        const summary = listeners
          .slice(0, 2)
          .map((item) => `${item.command}(${item.pid})`)
          .join(', ')
        console.log(chalk.gray(`     占用进程: ${summary}`))
      }
    }

    try { fs.unlinkSync(CONFIG_FILE) } catch {}

    console.log(chalk.gray('  → 写入配置...'))
    const result = runOpenClaw([
      'onboard',
      '--non-interactive',
      '--accept-risk',
      '--auth-choice', 'custom-api-key',
      '--custom-base-url', baseUrl,
      '--custom-api-key', apiKey,
      '--custom-model-id', primaryModel || 'claude-sonnet-4-6',
      '--custom-compatibility', 'anthropic',
      '--install-daemon',
    ], { preferNpx: runtime.via === 'npx' })

    if (result.status !== 0) {
      console.log(chalk.yellow('  ⚠️  onboard 失败，使用备用配置...'))
      _writeFallbackConfig(apiKey, baseUrl, selectedModels, primaryModel, gatewayPort)
    } else {
      _setGatewayPort(gatewayPort, runtime.via === 'npx')
    }

    _disableGatewayAuth(runtime.via === 'npx')
    const serviceReady = _installGatewayService(gatewayPort, runtime.via === 'npx')

    console.log(chalk.gray('  → 正在启动 Gateway...'))
    const ok = _startGateway(gatewayPort, runtime.via === 'npx', serviceReady)

    if (ok) {
      console.log(chalk.green('  ✓ OpenClaw Gateway 已启动'))
    } else {
      console.log(chalk.yellow('  ⚠️  Gateway 启动中，稍等几秒后刷新浏览器'))
    }

    const dashUrl = `http://127.0.0.1:${gatewayPort}/`
    console.log(chalk.cyan('\n  → 浏览器打开（无需 token）:'))
    console.log(chalk.bold.cyan(`     ${dashUrl}`))

    return {
      file: CONFIG_FILE,
      hot: false,
      dashboardUrl: dashUrl,
      gatewayPort,
      launchCmd: getLaunchCommand(gatewayPort),
    }
  },

  reset() {
    try { fs.unlinkSync(CONFIG_FILE) } catch {}
  },

  getConfigPath() { return CONFIG_FILE },
  getGatewayPort() { return getConfiguredGatewayPort() },
  getPortListeners(port = getConfiguredGatewayPort()) { return listPortListeners(port) },
  get hint() {
    return `Gateway 已启动，打开浏览器即可使用（默认端口 ${getConfiguredGatewayPort()}）`
  },
  get launchCmd() {
    return getLaunchCommand(getConfiguredGatewayPort())
  },
  get launchNote() {
    return `🌐 打开浏览器: http://127.0.0.1:${getConfiguredGatewayPort()}/`
  },
  installCmd: 'npm install -g openclaw@latest',
  docsUrl: 'https://docs.openclaw.ai',
}
