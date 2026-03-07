/**
 * hs balance — 查看账户余额和今日用量
 */
const chalk = require('chalk')
const ora   = require('ora')
const { getApiKey, SHOP_URL } = require('../utils/config')

async function balance() {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.log(chalk.red('\n未找到 API Key，请先运行: hs setup\n'))
    return
  }

  const spinner = ora('获取账户信息...').start()
  try {
    const fetch = require('node-fetch')
    // shop 的 /api/stats/overview 需要 JWT，这里通过 /internal 接口查余额
    // 或者通过 shop API 查询
    const res = await fetch(`${SHOP_URL}/api/stats/overview`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 8000,
    })

    if (res.status === 401) {
      spinner.fail('API Key 无效或已过期，请重新登录')
      return
    }

    if (!res.ok) {
      spinner.fail(`请求失败 (HTTP ${res.status})`)
      return
    }

    const data = await res.json()
    spinner.stop()

    console.log()
    console.log(chalk.bold('💰  账户余额'))
    console.log(chalk.gray('━'.repeat(40)))
    console.log()
    console.log(`  ${chalk.cyan('余额')}       $${chalk.bold(Number(data.balance || 0).toFixed(4))}`)
    console.log(`  ${chalk.cyan('今日消费')}   $${Number(data.todayCost || 0).toFixed(4)}`)
    console.log(`  ${chalk.cyan('本月消费')}   $${Number(data.monthCost || 0).toFixed(4)}`)
    console.log(`  ${chalk.cyan('累计调用')}   ${(data.totalCalls || 0).toLocaleString()} 次`)
    console.log()
    console.log(chalk.gray(`充值: ${SHOP_URL}/app/recharge`))
    console.log()

  } catch (e) {
    spinner.fail(`获取失败: ${e.message}`)
    console.log(chalk.gray(`\n请前往 ${SHOP_URL} 查看账户信息`))
  }
}

module.exports = balance
