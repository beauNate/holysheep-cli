/**
 * OpenClaw 适配器 (v2 — 基于实测的正确配置格式)
 *
 * 正确方案：写入 HolySheep 的 OpenAI + Anthropic + MiniMax provider，
 * 默认模型固定为 GPT-5.4，同时保留 Claude / MiniMax 模型供 /model 切换。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync, spawn, execSync } = require('child_process')
const { commandExists } = require('../utils/which')
const { BRIDGE_CONFIG_FILE } = require('./openclaw-bridge')

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json')
const isWin = process.platform === 'win32'
const DEFAULT_BRIDGE_PORT = 18788
const DEFAULT_GATEWAY_PORT = 18789
const MAX_PORT_SCAN = 40
const OPENCLAW_DEFAULT_MODEL = 'gpt-5.4'
const OPENCLAW_DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'
const OPENCLAW_DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.7-highspeed'
const OPENCLAW_PROVIDER_NAME = 'holysheep'

function getOpenClawBinaryCandidates() {
  return isWin ? ['openclaw.cmd', 'openclaw'] : ['openclaw']
}

function getBinaryRunner() {
  return isWin
    ? { cmd: 'openclaw.cmd', argsPrefix: [], shell: true, label: 'openclaw', via: 'binary' }
    : { cmd: 'openclaw', argsPrefix: [], shell: false, label: 'openclaw', via: 'binary' }
}

function hasOpenClawBinary() {
  return getOpenClawBinaryCandidates().some((cmd) => commandExists(cmd))
}

function hasNpx() {
  return commandExists('npx')
}

function getRunner(preferNpx = false) {
  const binaryRunner = hasOpenClawBinary() ? getBinaryRunner() : null

  if (!preferNpx && hasOpenClawBinary()) {
    return binaryRunner
  }
  if (hasNpx()) {
    return { cmd: 'npx', argsPrefix: ['openclaw'], shell: isWin, label: 'npx openclaw', via: 'npx' }
  }
  if (binaryRunner) {
    return binaryRunner
  }
  return null
}

function runWithRunner(runner, args, opts = {}) {
  return spawnSync(runner.cmd, [...runner.argsPrefix, ...args], {
    shell: runner.shell,
    timeout: opts.timeout || 30000,
    stdio: opts.stdio || 'pipe',
    encoding: 'utf8',
  })
}

function normalizeVersionOutput(text) {
  return firstLine(text).replace(/^openclaw\s+/i, '').trim()
}

function probeRunner(runner, timeout) {
  const result = runWithRunner(runner, ['--version'], { timeout })
  if (result.error || result.status !== 0) return null

  const version = normalizeVersionOutput(result.stdout || result.stderr || '')
  return version || null
}

/** 运行 openclaw CLI（优先全局命令，可切换到 npx 回退） */
function runOpenClaw(args, opts = {}) {
  const runner = getRunner(Boolean(opts.preferNpx))
  if (!runner) {
    return { status: 1, stdout: '', stderr: 'OpenClaw CLI not found' }
  }

  return runWithRunner(runner, args, opts)
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
  const runner = getRunner(preferNpx)
  if (!runner) return null
  return probeRunner(runner, preferNpx ? 60000 : 15000)
}

function detectRuntime() {
  const preferNpx = getPreferredRuntime()
  const runnerOrder = preferNpx ? [getRunner(true), getRunner(false)] : [getRunner(false), getRunner(true)]
  const seen = new Set()

  for (const runner of runnerOrder) {
    if (!runner) continue
    const key = `${runner.via}:${runner.cmd}:${runner.argsPrefix.join(' ')}`
    if (seen.has(key)) continue
    seen.add(key)

    const version = probeRunner(runner, runner.via === 'npx' ? 60000 : 15000)
    if (version) {
      return {
        available: true,
        via: runner.via,
        command: runner.label,
        version,
      }
    }
  }

  const fallbackRunner = getRunner(preferNpx)
  if (fallbackRunner) {
    return {
      available: false,
      via: fallbackRunner.via,
      command: fallbackRunner.label,
      version: null,
    }
  }

  return { available: false, via: null, command: null, version: null }
}

function readBridgeConfig() {
  try {
    if (fs.existsSync(BRIDGE_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(BRIDGE_CONFIG_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function writeBridgeConfig(data) {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true })
  fs.writeFileSync(BRIDGE_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function getConfiguredBridgePort(config = readBridgeConfig()) {
  const port = Number(config?.port)
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_BRIDGE_PORT
}

function getBridgeBaseUrl(port = getConfiguredBridgePort()) {
  return `http://127.0.0.1:${port}/v1`
}

function waitForBridge(port) {
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now()
    while (Date.now() - t0 < 500) {}

    try {
      execSync(
        isWin
          ? `powershell -NonInteractive -Command "try{(Invoke-WebRequest -Uri http://127.0.0.1:${port}/health -TimeoutSec 1 -UseBasicParsing).StatusCode}catch{exit 1}"`
          : `curl -sf http://127.0.0.1:${port}/health -o /dev/null --max-time 1`,
        { stdio: 'ignore', timeout: 3000 }
      )
      return true
    } catch {}
  }

  return false
}

function startBridge(port) {
  if (waitForBridge(port)) return true

  const scriptPath = path.join(__dirname, '..', 'index.js')
  const child = spawn(process.execPath, [scriptPath, 'openclaw-bridge', '--port', String(port)], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  return waitForBridge(port)
}

function getBridgeCommand(port = getConfiguredBridgePort()) {
  return `hs openclaw-bridge --port ${port}`
}

function pickPrimaryModel(primaryModel, selectedModels) {
  const models = Array.isArray(selectedModels) ? selectedModels : []
  return primaryModel || models[0] || OPENCLAW_DEFAULT_MODEL
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

function getConfiguredPrimaryModel(config = readConfig()) {
  return config?.agents?.defaults?.model?.primary || ''
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

function getDashboardCommand() {
  const runtime = module.exports._lastRuntimeCommand || (hasOpenClawBinary() ? 'openclaw' : 'npx openclaw')
  return `${runtime} dashboard --no-open`
}

function buildModelEntry(id) {
  return {
    id,
    name: `${id} (HolySheep)`,
    reasoning: false,
    input: ['text'],
    contextWindow: 200000,
    maxTokens: id.startsWith('gpt-') ? 8192 : 16000,
  }
}

function normalizeRequestedModels(selectedModels) {
  const requestedModels = Array.isArray(selectedModels) && selectedModels.length > 0
    ? [...selectedModels]
    : [OPENCLAW_DEFAULT_MODEL, OPENCLAW_DEFAULT_CLAUDE_MODEL, OPENCLAW_DEFAULT_MINIMAX_MODEL]

  if (!requestedModels.includes(OPENCLAW_DEFAULT_MODEL)) requestedModels.unshift(OPENCLAW_DEFAULT_MODEL)
  return Array.from(new Set(requestedModels))
}

function buildManagedPlan(baseUrlBridge, primaryModel, selectedModels) {
  const requestedModels = normalizeRequestedModels(selectedModels)
  const managedModelRefs = requestedModels.map((model) => `${OPENCLAW_PROVIDER_NAME}/${model}`)
  const fallbackPrimaryModel = pickPrimaryModel(primaryModel, requestedModels)
  const primaryRef = managedModelRefs.includes(`${OPENCLAW_PROVIDER_NAME}/${fallbackPrimaryModel}`)
    ? `${OPENCLAW_PROVIDER_NAME}/${fallbackPrimaryModel}`
    : managedModelRefs[0] || `${OPENCLAW_PROVIDER_NAME}/${OPENCLAW_DEFAULT_MODEL}`

  return {
    providers: {
      [OPENCLAW_PROVIDER_NAME]: {
        baseUrl: baseUrlBridge,
        api: 'openai-completions',
        models: requestedModels.map(buildModelEntry),
      },
    },
    managedModelRefs,
    models: requestedModels,
    primaryRef,
  }
}

function isHolySheepProvider(provider) {
  return typeof provider?.baseUrl === 'string' && (
    provider.baseUrl.includes('api.holysheep.ai') ||
    provider.baseUrl.includes('127.0.0.1')
  )
}

function writeManagedConfig(baseConfig, bridgeBaseUrl, primaryModel, selectedModels, gatewayPort) {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true })

  const plan = buildManagedPlan(bridgeBaseUrl, primaryModel, selectedModels)
  const existingProviders = baseConfig?.models?.providers || {}
  const managedProviderIds = Object.entries(existingProviders)
    .filter(([providerId, provider]) => providerId === OPENCLAW_PROVIDER_NAME || isHolySheepProvider(provider))
    .map(([providerId]) => providerId)

  const preservedProviders = Object.fromEntries(
    Object.entries(existingProviders).filter(([, provider]) => !isHolySheepProvider(provider))
  )

  const existingModelMap = baseConfig?.agents?.defaults?.models || {}
  const preservedModelMap = Object.fromEntries(
    Object.entries(existingModelMap).filter(([ref]) => {
      return !managedProviderIds.some((providerId) => ref.startsWith(`${providerId}/`))
    })
  )

  const managedModelMap = Object.fromEntries(plan.managedModelRefs.map((ref) => [ref, {}]))

  const nextConfig = {
    ...baseConfig,
    models: {
      ...(baseConfig.models || {}),
      mode: 'merge',
      providers: {
        ...preservedProviders,
        ...plan.providers,
      },
    },
    agents: {
      ...(baseConfig.agents || {}),
      defaults: {
        ...(baseConfig.agents?.defaults || {}),
        model: {
          ...(baseConfig.agents?.defaults?.model || {}),
          primary: plan.primaryRef,
        },
        models: {
          ...preservedModelMap,
          ...managedModelMap,
        },
      },
    },
    gateway: {
      ...(baseConfig.gateway || {}),
      mode: 'local',
      port: gatewayPort,
      bind: 'loopback',
      auth: {
        ...(baseConfig.gateway?.auth || {}),
        mode: 'none',
      },
    },
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf8')
  return plan
}

function _disableGatewayAuth(preferNpx = false) {
  try {
    runOpenClaw(['config', 'set', 'gateway.auth.mode', 'none'], { preferNpx })
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

function getDashboardUrl(port, preferNpx = false) {
  const result = runOpenClaw(['dashboard', '--no-open'], {
    preferNpx,
    timeout: preferNpx ? 60000 : 20000,
  })
  if (result.status === 0) {
    const match = String(result.stdout || '').match(/Dashboard URL:\s*(\S+)/)
    if (match) return match[1]
  }
  return `http://127.0.0.1:${port}/`
}

module.exports = {
  name: 'OpenClaw',
  id: 'openclaw',

  checkInstalled() {
    return detectRuntime().available
  },

  detectRuntime,

  getVersion() {
    return detectRuntime().version
  },

  isConfigured() {
    const cfg = readConfig()
    const hasProvider = cfg?.models?.providers?.[OPENCLAW_PROVIDER_NAME]?.baseUrl?.includes('127.0.0.1')
    const bridge = readBridgeConfig()
    return Boolean(hasProvider && bridge?.apiKey)
  },

  configure(apiKey, baseUrlAnthropic, baseUrlOpenAI, primaryModel, selectedModels) {
    const chalk = require('chalk')
    console.log(chalk.gray('\n  ⚙️  正在配置 OpenClaw...'))

    const runtime = detectRuntime()
    if (!runtime.available) {
      throw new Error('未检测到 OpenClaw；请先全局安装，或确保 npx 可用')
    }
    this._lastRuntimeCommand = runtime.command

    const resolvedPrimaryModel = pickPrimaryModel(primaryModel, selectedModels)
    const bridgePort = findAvailableGatewayPort(DEFAULT_BRIDGE_PORT)
    if (!bridgePort) {
      throw new Error(`找不到可用桥接端口（已检查 ${DEFAULT_BRIDGE_PORT}-${DEFAULT_BRIDGE_PORT + MAX_PORT_SCAN - 1}）`)
    }
    this._lastBridgePort = bridgePort

    writeBridgeConfig({
      port: bridgePort,
      apiKey,
      baseUrlAnthropic,
      baseUrlOpenAI,
      models: normalizeRequestedModels(selectedModels),
    })

    console.log(chalk.gray('  → 正在启动 HolySheep Bridge...'))
    if (!startBridge(bridgePort)) {
      throw new Error('HolySheep OpenClaw Bridge 启动失败')
    }
    const bridgeBaseUrl = getBridgeBaseUrl(bridgePort)

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
      '--custom-base-url', bridgeBaseUrl,
      '--custom-api-key', apiKey,
      '--custom-model-id', resolvedPrimaryModel,
      '--custom-compatibility', 'openai',
      '--gateway-port', String(gatewayPort),
      '--install-daemon',
    ], { preferNpx: runtime.via === 'npx' })

    if (result.status !== 0) {
      console.log(chalk.yellow('  ⚠️  onboard 失败，使用备用配置...'))
    }

    const plan = writeManagedConfig(
      result.status === 0 ? readConfig() : {},
      bridgeBaseUrl,
      resolvedPrimaryModel,
      selectedModels,
      gatewayPort,
    )

    _disableGatewayAuth(runtime.via === 'npx')
    const serviceReady = _installGatewayService(gatewayPort, runtime.via === 'npx')

    console.log(chalk.gray('  → 正在启动 Gateway...'))
    const ok = _startGateway(gatewayPort, runtime.via === 'npx', serviceReady)

    if (ok) {
      console.log(chalk.green('  ✓ OpenClaw Gateway 已启动'))
    } else {
      console.log(chalk.yellow('  ⚠️  Gateway 启动中，稍等几秒后刷新浏览器'))
    }

    const dashUrl = getDashboardUrl(gatewayPort, runtime.via === 'npx')
    console.log(chalk.cyan('\n  → 浏览器打开（推荐使用此地址）:'))
    console.log(chalk.bold.cyan(`     ${dashUrl}`))
    console.log(chalk.gray(`     Bridge 地址: ${bridgeBaseUrl}`))
    console.log(chalk.gray(`     默认模型: ${plan.primaryRef || OPENCLAW_DEFAULT_MODEL}`))
    console.log(chalk.gray('     如在 Windows 上打开裸 http://127.0.0.1:PORT/ 仍报 Unauthorized，请使用上面的 dashboard 地址'))

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
    try { fs.unlinkSync(BRIDGE_CONFIG_FILE) } catch {}
  },

  getConfigPath() { return CONFIG_FILE },
  getBridgePort() { return getConfiguredBridgePort() },
  getGatewayPort() { return getConfiguredGatewayPort() },
  getPrimaryModel() { return getConfiguredPrimaryModel() },
  getPortListeners(port = getConfiguredGatewayPort()) { return listPortListeners(port) },
  get hint() {
    return `Bridge + Gateway 已配置，默认模型为 ${getConfiguredPrimaryModel() || OPENCLAW_DEFAULT_MODEL}`
  },
  get launchSteps() {
    const bridgePort = getConfiguredBridgePort()
    const port = getConfiguredGatewayPort()
    return [
      { cmd: getBridgeCommand(bridgePort), note: '先启动 HolySheep OpenClaw Bridge' },
      { cmd: getLaunchCommand(port), note: '再启动 OpenClaw Gateway' },
      { cmd: getDashboardCommand(), note: '再生成/打开可直接连接的 Dashboard 地址（推荐）' },
    ]
  },
  get launchNote() {
    return `🌐 请先启动 Bridge，再启动 Gateway；最后运行 ${getDashboardCommand()}`
  },
  installCmd: 'npm install -g openclaw@latest',
  docsUrl: 'https://docs.openclaw.ai',
}
