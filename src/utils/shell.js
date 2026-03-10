/**
 * Shell RC 文件管理 — 写入/清理环境变量
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const MARKER_START = '# >>> holysheep-cli managed >>>'
const MARKER_END   = '# <<< holysheep-cli managed <<<'

function getShellRcFiles() {
  const home = os.homedir()

  // Windows：不写 shell rc，改用 setx 写系统环境变量
  if (process.platform === 'win32') return []

  const shell = process.env.SHELL || ''
  const candidates = []

  if (shell.includes('zsh'))  candidates.push(path.join(home, '.zshrc'))
  if (shell.includes('bash')) candidates.push(path.join(home, '.bashrc'), path.join(home, '.bash_profile'))
  if (shell.includes('fish')) candidates.push(path.join(home, '.config', 'fish', 'config.fish'))

  // 默认兜底
  if (candidates.length === 0) {
    const zshrc  = path.join(home, '.zshrc')
    const bashrc = path.join(home, '.bashrc')
    if (fs.existsSync(zshrc))  candidates.push(zshrc)
    if (fs.existsSync(bashrc)) candidates.push(bashrc)
    if (candidates.length === 0) candidates.push(zshrc)
  }

  return candidates
}

function removeHsBlock(content) {
  const re = new RegExp(
    `\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
    'g'
  )
  return content.replace(re, '')
}

/**
 * 移除 rc 文件里用户手动写的同名 export/set -gx 行
 * 防止旧值在 holysheep-cli managed 块之后覆盖新值
 */
function removeStaleExports(content, keys, isFish = false) {
  let result = content
  for (const key of keys) {
    if (isFish) {
      // fish: set -gx KEY "..." 或 set -gx KEY ...
      result = result.replace(new RegExp(`\\n?set\\s+-gx\\s+${escapeRegex(key)}\\s+[^\\n]*\\n?`, 'g'), '\n')
    } else {
      // bash/zsh: export KEY="..." 或 export KEY=...
      result = result.replace(new RegExp(`\\n?export\\s+${escapeRegex(key)}=[^\\n]*\\n?`, 'g'), '\n')
    }
  }
  // 清理多余空行
  return result.replace(/\n{3,}/g, '\n\n')
}

function buildEnvBlock(envVars, isFish = false) {
  const lines = [MARKER_START]
  for (const [k, v] of Object.entries(envVars)) {
    // fish shell 用 set -gx，其他 shell 用 export
    lines.push(isFish ? `set -gx ${k} "${v}"` : `export ${k}="${v}"`)
  }
  lines.push(MARKER_END)
  return '\n' + lines.join('\n') + '\n'
}

function writeEnvToShell(envVars) {
  // Windows: 用 setx 写入用户级环境变量（需重启终端生效）
  if (process.platform === 'win32') {
    const { execSync } = require('child_process')
    const written = []
    for (const [k, v] of Object.entries(envVars)) {
      try {
        execSync(`setx ${k} "${v}"`, { stdio: 'ignore' })
        written.push(`[系统环境变量] ${k}`)
      } catch {}
    }
    if (written.length > 0) {
      const chalk = require('chalk')
      console.log(chalk.yellow('\n  ⚠️  Windows 环境变量已写入，需要重启终端后生效'))
    }
    return written
  }

  const files = getShellRcFiles()
  const written = []

  for (const file of files) {
    let content = ''
    try { content = fs.readFileSync(file, 'utf8') } catch {}
    const isFish = file.endsWith('config.fish')
    // 1. 清理旧的 holysheep managed 块
    content = removeHsBlock(content)
    // 2. 清理用户手动写的同名 export（防止旧值覆盖新值）
    content = removeStaleExports(content, Object.keys(envVars), isFish)
    // 3. 追加新的 managed 块
    content += buildEnvBlock(envVars, isFish)
    fs.writeFileSync(file, content, 'utf8')
    written.push(file)
  }
  return written
}

function removeEnvFromShell(extraKeys = []) {
  // 默认清理的 key 列表（holysheep 相关的所有环境变量）
  const HS_KEYS = [
    'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL',
    'OPENAI_API_KEY', 'OPENAI_BASE_URL',
    'HOLYSHEEP_API_KEY',
    ...extraKeys,
  ]
  const files = getShellRcFiles()
  const cleaned = []
  for (const file of files) {
    if (!fs.existsSync(file)) continue
    const isFish = file.endsWith('config.fish')
    let content = fs.readFileSync(file, 'utf8')
    let updated = removeHsBlock(content)
    updated = removeStaleExports(updated, HS_KEYS, isFish)
    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf8')
      cleaned.push(file)
    }
  }
  return cleaned
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = { getShellRcFiles, writeEnvToShell, removeEnvFromShell }
