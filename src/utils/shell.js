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
  const shell = process.env.SHELL || ''
  const candidates = []

  if (shell.includes('zsh'))  candidates.push(path.join(home, '.zshrc'))
  if (shell.includes('bash')) candidates.push(path.join(home, '.bashrc'), path.join(home, '.bash_profile'))
  if (shell.includes('fish')) candidates.push(path.join(home, '.config', 'fish', 'config.fish'))

  // 默认兜底
  if (candidates.length === 0) {
    const zshrc = path.join(home, '.zshrc')
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

function buildEnvBlock(envVars) {
  const lines = [MARKER_START]
  for (const [k, v] of Object.entries(envVars)) {
    lines.push(`export ${k}="${v}"`)
  }
  lines.push(MARKER_END)
  return '\n' + lines.join('\n') + '\n'
}

function writeEnvToShell(envVars) {
  const files = getShellRcFiles()
  const written = []

  for (const file of files) {
    let content = ''
    try { content = fs.readFileSync(file, 'utf8') } catch {}
    content = removeHsBlock(content)
    content += buildEnvBlock(envVars)
    fs.writeFileSync(file, content, 'utf8')
    written.push(file)
  }
  return written
}

function removeEnvFromShell() {
  const files = getShellRcFiles()
  const cleaned = []
  for (const file of files) {
    if (!fs.existsSync(file)) continue
    let content = fs.readFileSync(file, 'utf8')
    const cleaned_content = removeHsBlock(content)
    if (cleaned_content !== content) {
      fs.writeFileSync(file, cleaned_content, 'utf8')
      cleaned.push(file)
    }
  }
  return cleaned
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = { getShellRcFiles, writeEnvToShell, removeEnvFromShell }
