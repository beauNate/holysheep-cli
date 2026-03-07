/**
 * Cursor 适配器
 * Cursor 是基于 VSCode 的 AI 编辑器
 *
 * Cursor 自定义 API 配置路径:
 *   Settings > Cursor > Models > Custom API Key
 *   实际存储在: ~/Library/Application Support/Cursor/User/globalStorage/cursor.secretStorage/...
 *
 * 由于 Cursor 的 API 配置在加密的 secret storage 中，CLI 无法直接写入，
 * 因此本适配器采用以下方式:
 *   1. 打印详细的手动配置引导
 *   2. 写入环境变量（部分 Cursor 功能如 API playground 会读取）
 *   3. 生成 .cursor/mcp.json 供 Cursor MCP 功能使用
 *
 * Cursor OpenAI 兼容格式: 在 Settings > Models 中填入 base URL 和 API Key
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
    // Cursor 配置在加密存储中，无法直接读取，只检查环境变量
    return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_BASE_URL?.includes('holysheep'))
  },
  configure(apiKey, baseUrlOpenAI) {
    // Cursor 无法通过文件直接写入 API Key（加密存储），
    // 返回 manual 标志，setup 命令会打印引导信息
    return {
      manual: true,
      steps: [
        '打开 Cursor → Settings（⌘+,）→ 搜索 "Models"',
        '找到 "OpenAI API Key" 或 "Custom API" 区域',
        `填入 API Key: ${apiKey}`,
        `填入 Base URL（Override OpenAI Base URL）: ${baseUrlOpenAI}`,
        '点击 "Verify" 验证连接',
        '在模型列表中选择 claude-sonnet-4-5 或 claude-opus-4-5',
      ],
      imageHint: '💡 Cursor Settings → Models → Override OpenAI Base URL',
    }
  },
  reset() {
    // 提示手动清除
    return { manual: true, steps: ['打开 Cursor Settings → Models → 清除 API Key 和 Base URL'] }
  },
  getConfigPath() { return getCursorUserDir() },
  hint: '需要在 Cursor GUI 中手动配置（API Key 存储在加密区域）',
  installCmd: '访问 https://cursor.sh 下载安装',
  docsUrl: 'https://cursor.sh',
}
