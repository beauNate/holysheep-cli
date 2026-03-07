/**
 * hs setup — 一键配置所有 AI 工具接入 HolySheep API
 */
const inquirer  = require('inquirer')
const chalk     = require('chalk')
const ora       = require('ora')
const { saveConfig, getApiKey, BASE_URL_ANTHROPIC, BASE_URL_OPENAI, SHOP_URL } = require('../utils/config')
const { writeEnvToShell } = require('../utils/shell')
const TOOLS = require('../tools')

const TOOL_CHOICES = TOOLS.map(t => ({
  name: `${t.checkInstalled() ? chalk.green('●') : chalk.gray('○')}  ${t.name.padEnd(18)} ${t.checkInstalled() ? chalk.gray('(已安装)') : chalk.gray('(未安装)')}`,
  value: t.id,
  short: t.name,
}))

async function setup(options) {
  console.log()
  console.log(chalk.bold('🐑  HolySheep CLI — 一键配置 AI 工具'))
  console.log(chalk.gray('━'.repeat(50)))
  console.log()

  // Step 1: 获取 API Key
  let apiKey = options.key || getApiKey()

  if (!apiKey) {
    console.log(chalk.yellow('需要 API Key 才能配置工具。'))
    console.log(chalk.cyan(`还没有账号？前往注册：${SHOP_URL}\n`))

    const { key } = await inquirer.prompt([{
      type: 'password',
      name: 'key',
      message: 'API Key (cr_xxx):',
      validate: v => v.startsWith('cr_') ? true : '请输入以 cr_ 开头的 API Key',
    }])
    apiKey = key
  } else {
    console.log(`${chalk.green('✓')} 使用已保存的 API Key: ${chalk.cyan(maskKey(apiKey))}`)
  }

  // Step 2: 选择工具
  const { toolIds } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'toolIds',
    message: '选择要配置的工具（空格选中，回车确认）:',
    choices: [
      new inquirer.Separator('── 已安装 ──'),
      ...TOOL_CHOICES.filter((_, i) => TOOLS[i].checkInstalled()),
      new inquirer.Separator('── 未安装 ──'),
      ...TOOL_CHOICES.filter((_, i) => !TOOLS[i].checkInstalled()),
    ],
    pageSize: 12,
  }])

  if (toolIds.length === 0) {
    console.log(chalk.yellow('\n未选择任何工具，退出。'))
    return
  }

  console.log()

  // Step 3: 配置每个工具
  const selectedTools = TOOLS.filter(t => toolIds.includes(t.id))
  const envVarsToWrite = {}
  const results = []

  for (const tool of selectedTools) {
    const spinner = ora(`配置 ${tool.name}...`).start()
    try {
      const result = tool.configure(apiKey, BASE_URL_ANTHROPIC, BASE_URL_OPENAI)

      if (result.manual) {
        spinner.info(`${chalk.yellow(tool.name)} 需要手动配置:`)
        result.steps.forEach((s, i) => console.log(`  ${chalk.gray(i + 1 + '.')} ${s}`))
        results.push({ tool, status: 'manual' })
      } else {
        // 收集需要写入 shell 的环境变量
        if (result.envVars) Object.assign(envVarsToWrite, result.envVars)
        spinner.succeed(`${chalk.green(tool.name)} ${chalk.gray(result.file ? `→ ${result.file}` : '')}`)
        results.push({ tool, status: 'ok', result })
      }
    } catch (e) {
      spinner.fail(`${chalk.red(tool.name)}: ${e.message}`)
      results.push({ tool, status: 'error', error: e.message })
    }
  }

  // Step 4: 写入通用环境变量（如果有工具需要）
  const needsEnvVars = selectedTools.some(t => t.id === 'codex' || t.id === 'aider')
  if (needsEnvVars || Object.keys(envVarsToWrite).length > 0) {
    const defaultEnv = {
      ANTHROPIC_API_KEY: apiKey,
      ANTHROPIC_BASE_URL: BASE_URL_ANTHROPIC,
      OPENAI_API_KEY: apiKey,
      OPENAI_BASE_URL: BASE_URL_OPENAI,
    }
    Object.assign(envVarsToWrite, defaultEnv)
  }

  if (Object.keys(envVarsToWrite).length > 0) {
    const spinner = ora('写入环境变量到 shell 配置文件...').start()
    try {
      const written = writeEnvToShell(envVarsToWrite)
      spinner.succeed(`环境变量已写入: ${written.map(f => chalk.cyan(f)).join(', ')}`)
    } catch (e) {
      spinner.fail(`写入环境变量失败: ${e.message}`)
    }
  }

  // Step 5: 保存 API Key 到本地
  saveConfig({ apiKey })

  // 摘要
  console.log()
  console.log(chalk.bold('━'.repeat(50)))
  console.log(chalk.green.bold('✅ 配置完成！'))
  console.log()

  const ok = results.filter(r => r.status === 'ok')
  const manual = results.filter(r => r.status === 'manual')
  const errors = results.filter(r => r.status === 'error')

  if (ok.length) {
    console.log(chalk.green(`已配置 ${ok.length} 个工具:`))
    ok.forEach(r => {
      const hot = r.result?.hot ? chalk.cyan(' (热切换，无需重启)') : chalk.gray(' (重启终端生效)')
      console.log(`  ✓ ${r.tool.name}${hot}`)
      if (r.tool.hint) console.log(`    ${chalk.gray('💡 ' + r.tool.hint)}`)
    })
    console.log()
  }

  if (manual.length) {
    console.log(chalk.yellow(`${manual.length} 个工具需要手动配置（见上方步骤）`))
    console.log()
  }

  if (errors.length) {
    console.log(chalk.red(`${errors.length} 个工具配置失败:`))
    errors.forEach(r => console.log(`  ✗ ${r.tool.name}: ${r.error}`))
    console.log()
  }

  console.log(chalk.gray('如需切换其他工具，运行: hs setup'))
  console.log(chalk.gray('查看余额: hs balance'))
  console.log(chalk.gray('检查配置: hs doctor'))
  console.log()
}

function maskKey(key) {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 6) + '...' + key.slice(-4)
}

module.exports = setup
