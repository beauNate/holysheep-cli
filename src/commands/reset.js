/**
 * hs reset — 清除所有工具的 HolySheep 配置，恢复默认
 */
const inquirer = require('inquirer')
const chalk    = require('chalk')
const ora      = require('ora')
const { removeEnvFromShell } = require('../utils/shell')
const { saveConfig } = require('../utils/config')
const TOOLS = require('../tools')

async function reset(options) {
  console.log()
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow('将清除所有工具的 HolySheep 配置和环境变量，继续？'),
      default: false,
    }])
    if (!confirm) { console.log('已取消\n'); return }
  }

  console.log()
  for (const tool of TOOLS) {
    if (!tool.checkInstalled() && !tool.isConfigured?.()) continue
    const spinner = ora(`清除 ${tool.name}...`).start()
    try {
      tool.reset()
      spinner.succeed(`${tool.name} 已清除`)
    } catch (e) {
      spinner.fail(`${tool.name}: ${e.message}`)
    }
  }

  // 清除 shell 环境变量
  const spinner = ora('清除 shell 环境变量...').start()
  try {
    const cleaned = removeEnvFromShell()
    if (cleaned.length) spinner.succeed(`已清除: ${cleaned.join(', ')}`)
    else spinner.info('无 shell 环境变量需要清除')
  } catch (e) {
    spinner.fail(e.message)
  }

  // 清除本地保存的 API Key
  saveConfig({ apiKey: '' })

  console.log()
  console.log(chalk.green('✅ 清除完成，所有工具已恢复默认配置'))
  console.log(chalk.gray('重新配置: hs setup\n'))
}

module.exports = reset
