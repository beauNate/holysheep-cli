/**
 * Cursor 适配器
 *
 * ⚠️ 重要：Cursor 新版本（2025+）必须登录官方账号才能使用，
 * 即使是「自带 API Key」模式也需要先登录 Cursor 账号。
 * Cursor 的 API Key 和 Base URL 存储在加密的 secret storage 中，
 * CLI 无法直接写入，且官方越来越绑定自己的账号体系。
 *
 * 推荐替代方案：
 * - Continue（VS Code/JetBrains 插件，完全支持自定义 API）
 * - Claude Code（命令行，官方支持自定义 base_url）
 * - Aider（命令行，完全支持自定义 API）
 *
 * 如果仍要手动配置 Cursor：
 * Settings → Models → Override OpenAI Base URL + OpenAI API Key
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

function getCursorUserDir() {
  const p = process.platform
  if (p === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User')
  if (p === 'win32')  return path.join(os.homedir(), 'AppData', 'Roaming', 'Cursor', 'User')
  return path.join(os.homedir(), '.config', 'Cursor', 'User')
}

function checkCursorInstalled() {
  const p = process.platform
  if (p === 'darwin') return fs.existsSync('/Applications/Cursor.app') || fs.existsSync(path.join(os.homedir(), 'Applications', 'Cursor.app'))
  if (p === 'win32')  return fs.existsSync(path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'cursor', 'Cursor.exe'))
  try { execSync('which cursor', { stdio: 'ignore' }); return true } catch {}
  return false
}

module.exports = {
  name: 'Cursor',
  id: 'cursor',
  checkInstalled() { return checkCursorInstalled() },
  isConfigured() {
    return false // 无法检测（加密存储）
  },
  configure(apiKey, _baseUrlAnthropicNoV1, baseUrlOpenAI) {
    // Cursor 需要登录官方账号，且 API Key 存储在加密区域，CLI 无法写入
    // 返回 manual + warning
    return {
      manual: true,
      steps: [
        '⚠️  Cursor 新版本需要先登录官方账号（免费账号即可）',
        '打开 Cursor → Settings（⌘+, / Ctrl+,）→ 左侧 Models',
        '找到 "OpenAI API Key" 区域，勾选 "Enable OpenAI API Key"',
        `填入 API Key: ${apiKey}`,
        `填入 Override OpenAI Base URL: ${baseUrlOpenAI}`,
        '点击 "Verify" 验证连接，然后在模型列表中选择 claude-* 模型',
        '💡 推荐使用 Continue（VS Code 插件）替代，配置更简单',
      ],
    }
  },
  reset() {
    return {
      manual: true,
      steps: ['打开 Cursor Settings → Models → 清除 API Key 和 Override Base URL'],
    }
  },
  getConfigPath() { return getCursorUserDir() },
  hint: '需要登录 Cursor 账号 + 在 GUI 中手动配置（推荐用 Continue 替代）',
  installCmd: '访问 https://cursor.sh 下载安装',
  docsUrl: 'https://cursor.sh',
  unsupported: true,
}
