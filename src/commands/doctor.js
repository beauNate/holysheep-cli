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

  // Node.js 版本
  const nodeVer = process.version
  const nodeOk = parseInt(nodeVer.slice(1)) >= 16
  printCheck(nodeOk, `Node.js ${nodeVer}`, nodeOk ? '' : '需要 >= 16')

  // API Key
  const apiKey = getApiKey()
  printCheck(!!apiKey, 'API Key', apiKey ? maskKey(apiKey) : `未设置 — 运行 ${chalk.cyan('hs setup')} 配置`)

  // 环境变量
  const envAnthropicKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
  const envOpenAIKey    = process.env.OPENAI_API_KEY
  const envAnthropicUrl = process.env.ANTHROPIC_BASE_URL
  const envOpenAIUrl    = process.env.OPENAI_BASE_URL

  console.log()
  console.log(chalk.bold('环境变量:'))
  printCheck(!!envAnthropicKey, 'ANTHROPIC_API_KEY / AUTH_TOKEN', envAnthropicKey ? maskKey(envAnthropicKey) : '未设置')
  printCheck(!!envAnthropicUrl, 'ANTHROPIC_BASE_URL', envAnthropicUrl || '未设置')
  printCheck(!!envOpenAIKey,    'OPENAI_API_KEY',     envOpenAIKey ? maskKey(envOpenAIKey) : '未设置')
  printCheck(!!envOpenAIUrl,    'OPENAI_BASE_URL',    envOpenAIUrl || '未设置')

  // 各工具检查
  console.log()
  console.log(chalk.bold('工具状态:'))

  for (const tool of TOOLS) {
    const installed  = tool.checkInstalled()
    const configured = installed ? tool.isConfigured() : null
    const version    = installed ? getVersion(tool.id) : null

    if (!installed) {
      console.log(`  ${chalk.gray('○')} ${chalk.gray(tool.name.padEnd(20))} ${chalk.gray('未安装')} ${chalk.gray(`— ${tool.installCmd}`)}`)
    } else if (configured) {
      console.log(`  ${chalk.green('✓')} ${chalk.green(tool.name.padEnd(20))} ${chalk.gray(version || '已安装')} ${chalk.green('已配置 HolySheep')}`)
    } else {
      console.log(`  ${chalk.yellow('!')} ${chalk.yellow(tool.name.padEnd(20))} ${chalk.gray(version || '已安装')} ${chalk.yellow('未配置')} ${chalk.gray(`— 运行 hs setup`)}`)
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
  const icon   = ok ? chalk.green('✓') : chalk.red('✗')
  const lbl    = ok ? chalk.green(label.padEnd(35)) : chalk.red(label.padEnd(35))
  const det    = detail ? chalk.gray(detail) : ''
  console.log(`  ${icon} ${lbl} ${det}`)
}

function maskKey(key) {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 6) + '...' + key.slice(-4)
}

function getVersion(toolId) {
  const cmds = {
    'claude-code': 'claude --version',
    'codex':       'codex --version',
    'gemini-cli':  'gemini --version',
    'opencode':    'opencode --version',
    'openclaw':    'openclaw --version',
    'aider':       'aider --version',
  }
  const cmd = cmds[toolId]
  if (!cmd) return null
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim().split('\n')[0].slice(0, 30)
  } catch { return null }
}

module.exports = doctor
