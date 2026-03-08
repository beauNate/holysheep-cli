/**
 * hs login   — 登录并保存 API Key
 * hs logout  — 清除本地 API Key
 * hs whoami  — 显示当前登录状态
 */
'use strict'

const inquirer = require('inquirer')
const chalk    = require('chalk')
const ora      = require('ora')
const fetch    = require('node-fetch')
const { execSync } = require('child_process')
const { loadConfig, saveConfig, getApiKey, BASE_URL_OPENAI, SHOP_URL, CONFIG_FILE } = require('../utils/config')
const fs = require('fs')

const MODELS_URL = `${BASE_URL_OPENAI}/models`

function maskKey(key) {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 8) + '...' + key.slice(-4)
}

/**
 * 调用 /v1/models 验证 API Key 是否有效
 * @returns {boolean}
 */
async function validateApiKey(apiKey) {
  const res = await fetch(MODELS_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })
  return res.status === 200
}

// ── login ────────────────────────────────────────────────────────────────────
async function login() {
  console.log()
  console.log(chalk.bold('🐑  HolySheep — 登录'))
  console.log(chalk.gray('━'.repeat(50)))
  console.log()

  // 检查是否已登录
  const existing = getApiKey()
  if (existing) {
    console.log(`${chalk.green('✓')} 已登录，当前 API Key: ${chalk.cyan(maskKey(existing))}`)
    const { relogin } = await inquirer.prompt([{
      type: 'confirm',
      name: 'relogin',
      message: '是否使用新的 API Key 重新登录？',
      default: false,
    }])
    if (!relogin) {
      console.log(chalk.gray('保持当前登录，退出。'))
      console.log()
      return
    }
    console.log()
  }

  // 提示用户获取 key 的方式
  console.log(chalk.cyan('获取 API Key 的方式：'))
  console.log(`  ${chalk.bold('a)')} 输入已有的 API Key (cr_xxx)`)
  console.log(`  ${chalk.bold('b)')} 打开浏览器前往 ${chalk.cyan(SHOP_URL)} 注册`)
  console.log()

  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: '请选择：',
    choices: [
      { name: '输入已有的 API Key', value: 'input' },
      { name: `打开浏览器注册 (${SHOP_URL})`, value: 'browser' },
    ],
  }])

  if (choice === 'browser') {
    console.log(chalk.gray(`\n正在打开浏览器: ${SHOP_URL}`))
    try {
      const platform = process.platform
      if (platform === 'darwin') execSync(`open "${SHOP_URL}"`)
      else if (platform === 'win32') execSync(`start "" "${SHOP_URL}"`)
      else execSync(`xdg-open "${SHOP_URL}"`)
    } catch {
      console.log(chalk.yellow(`无法自动打开浏览器，请手动访问: ${SHOP_URL}`))
    }
    console.log()
  }

  // 输入 API Key
  const { apiKey } = await inquirer.prompt([{
    type: 'password',
    name: 'apiKey',
    message: '请输入 API Key (cr_xxx):',
    validate: v => {
      if (!v || !v.trim()) return '请输入 API Key'
      if (!v.trim().startsWith('cr_')) return '请输入以 cr_ 开头的 API Key'
      return true
    },
  }])

  const key = apiKey.trim()

  // 验证 API Key
  const spinner = ora('正在验证 API Key...').start()
  try {
    const valid = await validateApiKey(key)
    if (!valid) {
      spinner.fail(chalk.red('API Key 无效，请检查后重试'))
      console.log(chalk.gray(`  前往获取有效 Key: ${SHOP_URL}`))
      console.log()
      process.exit(1)
    }
  } catch (e) {
    spinner.fail(`验证失败: ${e.message}`)
    console.log(chalk.yellow('  网络异常，请检查网络连接后重试'))
    console.log()
    process.exit(1)
  }

  // 保存
  saveConfig({ apiKey: key, savedAt: new Date().toISOString() })
  spinner.succeed(chalk.green('API Key 验证成功并已保存！'))

  console.log()
  console.log(`  Key: ${chalk.cyan(maskKey(key))}`)
  console.log(`  配置文件: ${chalk.gray(CONFIG_FILE)}`)
  console.log()
  console.log(chalk.bold('接下来：'))
  console.log(`  运行 ${chalk.cyan('hs setup')} 一键配置 AI 工具`)
  console.log(`  运行 ${chalk.cyan('hs whoami')} 查看登录状态`)
  console.log()
}

// ── logout ───────────────────────────────────────────────────────────────────
async function logout() {
  console.log()
  const existing = getApiKey()
  if (!existing) {
    console.log(chalk.yellow('当前未登录（无本地 API Key）'))
    console.log()
    return
  }

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: `确认退出登录？将删除本地 API Key (${maskKey(existing)})`,
    default: false,
  }])

  if (!confirm) {
    console.log(chalk.gray('取消，保持当前登录。'))
    console.log()
    return
  }

  try {
    const config = loadConfig()
    delete config.apiKey
    delete config.savedAt
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    console.log(chalk.green('✓ 已退出登录，本地 API Key 已清除'))
  } catch (e) {
    console.log(chalk.red(`退出失败: ${e.message}`))
  }
  console.log()
}

// ── whoami ───────────────────────────────────────────────────────────────────
async function whoami() {
  console.log()
  console.log(chalk.bold('🐑  HolySheep — 登录状态'))
  console.log(chalk.gray('━'.repeat(50)))
  console.log()

  const apiKey = getApiKey()
  if (!apiKey) {
    console.log(chalk.yellow('未登录 — 本地无 API Key'))
    console.log(chalk.gray(`运行 ${chalk.cyan('hs login')} 登录`))
    console.log()
    return
  }

  console.log(`状态: ${chalk.green('● 已登录')}`)
  console.log(`Key:  ${chalk.cyan(maskKey(apiKey))}`)

  const config = loadConfig()
  if (config.savedAt) {
    console.log(`保存时间: ${chalk.gray(new Date(config.savedAt).toLocaleString())}`)
  }

  // 验证 key 是否仍然有效
  const spinner = ora('验证 Key 有效性...').start()
  try {
    const valid = await validateApiKey(apiKey)
    if (valid) {
      spinner.succeed(chalk.green('Key 有效'))
    } else {
      spinner.fail(chalk.red('Key 已失效，请重新登录 (hs login)'))
    }
  } catch (e) {
    spinner.warn(`无法验证（网络异常）: ${e.message}`)
  }
  console.log()
}

module.exports = { login, logout, whoami }
