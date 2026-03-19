/**
 * hs doctor — 检查所有工具的配置状态
 */
const chalk = require('chalk')
const { execSync } = require('child_process')
const { getApiKey, BASE_URL_ANTHROPIC, BASE_URL_OPENAI } = require('../utils/config')
const TOOLS = require('../tools')

async function doctor() {
  console.log()
  console.log(chalk.bold('🔍  HolySheep Doctor — 环境检查'))
  console.log(chalk.gray('━'.repeat(50)))
  console.log()

  const nodeMajor = parseInt(process.version.slice(1), 10)

  // Node.js 版本
  const nodeVer = process.version
  const nodeOk = nodeMajor >= 16
  printCheck(nodeOk, `Node.js ${nodeVer}`, nodeOk ? '' : '需要 >= 16')

  // API Key
  const apiKey = getApiKey()
  printCheck(!!apiKey, 'API Key', apiKey ? maskKey(apiKey) : `未设置 — 运行 ${chalk.cyan('hs setup')} 配置`)

  // 环境变量
  const envAnthropicKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
  const envOpenAIKey = process.env.OPENAI_API_KEY
  const envAnthropicUrl = process.env.ANTHROPIC_BASE_URL
  const envOpenAIUrl = process.env.OPENAI_BASE_URL

  console.log()
  console.log(chalk.bold('环境变量:'))
  printCheck(!!envAnthropicKey, 'ANTHROPIC_API_KEY / AUTH_TOKEN', envAnthropicKey ? maskKey(envAnthropicKey) : '未设置')
  printCheck(!!envAnthropicUrl, 'ANTHROPIC_BASE_URL', envAnthropicUrl || '未设置')
  printCheck(!!envOpenAIKey, 'OPENAI_API_KEY', envOpenAIKey ? maskKey(envOpenAIKey) : '未设置')
  printCheck(!!envOpenAIUrl, 'OPENAI_BASE_URL', envOpenAIUrl || '未设置')

  // 各工具检查
  console.log()
  console.log(chalk.bold('工具状态:'))

  for (const tool of TOOLS) {
    const installState = getInstallState(tool)
    const installed = installState.installed
    const configured = installed ? tool.isConfigured() : null
    const version = installState.version
    const suffix = installState.detail ? chalk.gray(` (${installState.detail})`) : ''

    if (!installed) {
      console.log(`  ${chalk.gray('○')} ${chalk.gray(tool.name.padEnd(20))} ${chalk.gray('未安装')} ${chalk.gray(`— ${tool.installCmd}`)}`)
    } else if (configured) {
      console.log(`  ${chalk.green('✓')} ${chalk.green(tool.name.padEnd(20))} ${chalk.gray(version || '已安装')}${suffix} ${chalk.green('已配置 HolySheep')}`)
    } else {
      console.log(`  ${chalk.yellow('!')} ${chalk.yellow(tool.name.padEnd(20))} ${chalk.gray(version || '已安装')}${suffix} ${chalk.yellow('未配置')} ${chalk.gray('— 运行 hs setup')}`)
    }

    if (tool.id === 'openclaw' && installed) {
      printOpenClawDetails(tool, installState, nodeMajor)
    }
  }

  console.log()

  // 连通性测试（可选）
  if (apiKey) {
    process.stdout.write(chalk.gray('测试 API 连通性... '))
    try {
      const fetch = require('node-fetch')
      const res = await fetch(`${BASE_URL_ANTHROPIC}/v1/models`, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        timeout: 8000,
      })
      if (res.ok) {
        const data = await res.json()
        const count = data.data?.length || '?'
        console.log(chalk.green(`✓ 连通 (${count} 个模型可用)`))
      } else {
        console.log(chalk.red(`✗ 失败 (HTTP ${res.status})`))
      }
    } catch (e) {
      console.log(chalk.red(`✗ 连接失败: ${e.message}`))
    }
  }

  console.log()
}

function printCheck(ok, label, detail = '') {
  const icon = ok ? chalk.green('✓') : chalk.red('✗')
  const lbl = ok ? chalk.green(label.padEnd(35)) : chalk.red(label.padEnd(35))
  const det = detail ? chalk.gray(detail) : ''
  console.log(`  ${icon} ${lbl} ${det}`)
}

function printOpenClawDetails(tool, installState, nodeMajor) {
  const details = []
  const gatewayPort = typeof tool.getGatewayPort === 'function' ? tool.getGatewayPort() : 18789
  const primaryModel = typeof tool.getPrimaryModel === 'function' ? tool.getPrimaryModel() : ''
  const listeners = typeof tool.getPortListeners === 'function' ? tool.getPortListeners(gatewayPort) : []
  const foreignListeners = listeners.filter((item) => !String(item.command || '').toLowerCase().includes('openclaw'))

  if (installState.detail === 'npx fallback') {
    details.push({
      level: 'info',
      text: '未检测到全局 openclaw，当前将通过 npx 运行',
    })
  }

  details.push(
    nodeMajor >= 20
      ? { level: 'ok', text: `OpenClaw Node 版本要求满足（当前 ${process.version}）` }
      : { level: 'warn', text: `OpenClaw 建议 Node.js >= 20（当前 ${process.version}）` }
  )

  if (primaryModel) {
    details.push({
      level: 'info',
      text: `当前默认模型：${primaryModel}`,
    })
  }

  if (foreignListeners.length) {
    const occupiedBy = foreignListeners
      .slice(0, 2)
      .map((item) => `${item.command}(${item.pid})`)
      .join(', ')
    details.push({
      level: 'warn',
      text: `Gateway 端口 ${gatewayPort} 被其他进程占用：${occupiedBy}`,
    })
  } else if (listeners.length) {
    details.push({
      level: 'ok',
      text: `Gateway 端口 ${gatewayPort} 当前由 OpenClaw 占用`,
    })
  } else {
    details.push({
      level: 'info',
      text: `Gateway 端口 ${gatewayPort} 当前空闲；如刚完成配置，可运行 ${tool.launchCmd}`,
    })
  }

  details.forEach((detail) => {
    const icon = detail.level === 'ok'
      ? chalk.green('↳')
      : detail.level === 'warn'
        ? chalk.yellow('↳')
        : chalk.gray('↳')
    const text = detail.level === 'ok'
      ? chalk.green(detail.text)
      : detail.level === 'warn'
        ? chalk.yellow(detail.text)
        : chalk.gray(detail.text)
    console.log(`    ${icon} ${text}`)
  })
}

function maskKey(key) {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 6) + '...' + key.slice(-4)
}

function getInstallState(tool) {
  if (tool.id === 'openclaw' && typeof tool.detectRuntime === 'function') {
    const runtime = tool.detectRuntime()
    return {
      installed: runtime.available,
      version: runtime.version,
      detail: runtime.via === 'npx' ? 'npx fallback' : '',
    }
  }

  const installed = tool.checkInstalled()
  return {
    installed,
    version: installed ? getVersion(tool) : null,
    detail: '',
  }
}

function getVersion(tool) {
  if (typeof tool.getVersion === 'function') {
    return tool.getVersion()
  }

  const cmds = {
    'claude-code': 'claude --version',
    'codex': 'codex --version',
    'droid': 'droid --version',
    'gemini-cli': 'gemini --version',
    'opencode': 'opencode --version',
    'openclaw': 'openclaw --version',
    'aider': 'aider --version',
  }
  const cmd = cmds[tool.id]
  if (!cmd) return null
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim().split('\n')[0].slice(0, 30)
  } catch {
    return null
  }
}

module.exports = doctor
