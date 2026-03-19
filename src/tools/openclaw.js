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

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json')
const isWin = process.platform === 'win32'
const DEFAULT_GATEWAY_PORT = 18789
const MAX_PORT_SCAN = 20
const OPENCLAW_DEFAULT_MODEL = 'gpt-5.4'
const OPENCLAW_DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'
const OPENCLAW_DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.7-highspeed'
const OPENCLAW_ROUTING_REGRESSION_VERSION = /^2026\.3\.13(?:\D|$)/

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

function isRoutingRegressionVersion(version) {
  return OPENCLAW_ROUTING_REGRESSION_VERSION.test(String(version || '').trim())
}

function getRoutingRegressionWarning(runtimeVersion, minimaxModelRef) {
  if (!isRoutingRegressionVersion(runtimeVersion) || !minimaxModelRef) {
    return ''
  }

  return `当前 OpenClaw 2026.3.13 存在 provider 路由回归，但 HolySheep 仍会保留 MiniMax 配置。若网页模型切换失败，请直接输入 /model ${minimaxModelRef}，或升级 OpenClaw 后再试。`
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

function buildProviderName(baseUrl, prefix) {
  const hostname = new URL(baseUrl).hostname.replace(/\./g, '-')
  return `${prefix}-${hostname}`
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

function buildManagedPlan(apiKey, baseUrlAnthropic, baseUrlOpenAI, selectedModels) {
  const requestedModels = Array.isArray(selectedModels) && selectedModels.length > 0
    ? selectedModels
    : [OPENCLAW_DEFAULT_MODEL, OPENCLAW_DEFAULT_CLAUDE_MODEL, OPENCLAW_DEFAULT_MINIMAX_MODEL]

  const openaiModels = requestedModels.filter((model) => model.startsWith('gpt-'))
  if (!openaiModels.includes(OPENCLAW_DEFAULT_MODEL)) {
    openaiModels.unshift(OPENCLAW_DEFAULT_MODEL)
  }

  const claudeModels = requestedModels.filter((model) => model.startsWith('claude-'))
  if (claudeModels.length === 0) {
    claudeModels.push(OPENCLAW_DEFAULT_CLAUDE_MODEL)
  }

   const minimaxModels = requestedModels.filter((model) => model.startsWith('MiniMax-'))
   if (requestedModels.includes(OPENCLAW_DEFAULT_MINIMAX_MODEL) && !minimaxModels.includes(OPENCLAW_DEFAULT_MINIMAX_MODEL)) {
     minimaxModels.unshift(OPENCLAW_DEFAULT_MINIMAX_MODEL)
   }

  const openaiProviderName = buildProviderName(baseUrlOpenAI, 'custom-openai')
  const anthropicProviderName = buildProviderName(baseUrlAnthropic, 'custom-anthropic')
  const minimaxProviderName = buildProviderName(`${baseUrlAnthropic.replace(/\/+$/, '')}/minimax`, 'custom-minimax')

  const providers = {
    [openaiProviderName]: {
      baseUrl: baseUrlOpenAI,
      apiKey,
      api: 'openai-completions',
      models: openaiModels.map(buildModelEntry),
    },
    [anthropicProviderName]: {
      baseUrl: baseUrlAnthropic,
      apiKey,
      api: 'anthropic-messages',
      models: claudeModels.map(buildModelEntry),
    },
  }

  if (minimaxModels.length > 0) {
    providers[minimaxProviderName] = {
      baseUrl: `${baseUrlAnthropic.replace(/\/+$/, '')}/minimax`,
      apiKey,
      api: 'anthropic-messages',
      models: minimaxModels.map(buildModelEntry),
    }
  }

  const managedModelRefs = [
    ...openaiModels.map((id) => `${openaiProviderName}/${id}`),
    ...claudeModels.map((id) => `${anthropicProviderName}/${id}`),
    ...minimaxModels.map((id) => `${minimaxProviderName}/${id}`),
  ]

  return {
    providers,
    managedModelRefs,
    primaryRef: `${openaiProviderName}/${OPENCLAW_DEFAULT_MODEL}`,
    minimaxRef: minimaxModels[0] ? `${minimaxProviderName}/${minimaxModels[0]}` : '',
  }
}

function isHolySheepProvider(provider) {
  return typeof provider?.baseUrl === 'string' && provider.baseUrl.includes('api.holysheep.ai')
}

function writeManagedConfig(baseConfig, apiKey, baseUrlAnthropic, baseUrlOpenAI, selectedModels, gatewayPort) {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true })

  const plan = buildManagedPlan(apiKey, baseUrlAnthropic, baseUrlOpenAI, selectedModels)
  const existingProviders = baseConfig?.models?.providers || {}
  const managedProviderIds = Object.entries(existingProviders)
    .filter(([, provider]) => isHolySheepProvider(provider))
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
    const cfg = JSON.stringify(readConfig())
    return cfg.includes('holysheep.ai')
  },

  configure(apiKey, baseUrlAnthropic, baseUrlOpenAI, _primaryModel, selectedModels) {
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
      '--custom-base-url', baseUrlOpenAI,
      '--custom-api-key', apiKey,
      '--custom-model-id', OPENCLAW_DEFAULT_MODEL,
      '--custom-compatibility', 'openai',
      '--gateway-port', String(gatewayPort),
      '--install-daemon',
    ], { preferNpx: runtime.via === 'npx' })

    if (result.status !== 0) {
      console.log(chalk.yellow('  ⚠️  onboard 失败，使用备用配置...'))
    }

    const plan = writeManagedConfig(
      result.status === 0 ? readConfig() : {},
      apiKey,
      baseUrlAnthropic,
      baseUrlOpenAI,
      selectedModels,
      gatewayPort,
    )

    const routingRegressionWarning = getRoutingRegressionWarning(runtime.version, plan.minimaxRef)
    if (routingRegressionWarning) {
      console.log(chalk.yellow(`  ⚠️  ${routingRegressionWarning}`))
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

    const dashUrl = getDashboardUrl(gatewayPort, runtime.via === 'npx')
    console.log(chalk.cyan('\n  → 浏览器打开（推荐使用此地址）:'))
    console.log(chalk.bold.cyan(`     ${dashUrl}`))
    console.log(chalk.gray(`     默认模型: ${OPENCLAW_DEFAULT_MODEL}`))
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
  },

  getConfigPath() { return CONFIG_FILE },
  getGatewayPort() { return getConfiguredGatewayPort() },
  getPrimaryModel() { return getConfiguredPrimaryModel() },
  getPortListeners(port = getConfiguredGatewayPort()) { return listPortListeners(port) },
  get hint() {
    return `Gateway 已启动，默认模型为 ${getConfiguredPrimaryModel() || OPENCLAW_DEFAULT_MODEL}`
  },
  get launchSteps() {
    const port = getConfiguredGatewayPort()
    return [
      { cmd: getLaunchCommand(port), note: '先启动 OpenClaw Gateway' },
      { cmd: getDashboardCommand(), note: '再生成/打开可直接连接的 Dashboard 地址（推荐）' },
    ]
  },
  get launchNote() {
    return `🌐 推荐运行 ${getDashboardCommand()}；Windows 上不要只打开裸 http://127.0.0.1:${getConfiguredGatewayPort()}/`
  },
  installCmd: 'npm install -g openclaw@latest',
  docsUrl: 'https://docs.openclaw.ai',
}
