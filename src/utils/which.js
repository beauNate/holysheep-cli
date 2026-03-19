/**
 * 跨平台检测命令是否存在
 * Windows 用 where，Unix 用 which，兜底用 --version
 */
const { execSync } = require('child_process')

function canRun(command, options = {}) {
  try {
    execSync(command, { stdio: 'ignore', ...options })
    return true
  } catch {
    return false
  }
}

function commandExists(cmd) {
  if (process.platform === 'win32') {
    const variants = [cmd, `${cmd}.cmd`, `${cmd}.exe`, `${cmd}.bat`]
    for (const variant of variants) {
      if (canRun(`where ${variant}`)) return true
    }

    // Windows 上很多 npm 全局命令实际是 .cmd 包装器，需要交给 cmd.exe 执行。
    for (const variant of variants) {
      if (canRun(`cmd /d /s /c "${variant} --version"`, { timeout: 3000 })) return true
    }

    return false
  }

  if (canRun(`which ${cmd}`)) return true

  // 兜底：直接跑 --version
  return canRun(`${cmd} --version`, { timeout: 3000 })
}

module.exports = { commandExists }
