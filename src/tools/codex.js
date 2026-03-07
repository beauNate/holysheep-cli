/**
 * Codex CLI 适配器 (@openai/codex v0.111+, Rust 版)
 *
 * ⚠️ 重要：v0.111.0 起 Codex 已切换到 Rust 实现（codex-rs）
 * 配置文件变更：~/.codex/config.toml（TOML 格式，不是 JSON！）
 *
 * 正确格式（config.toml）:
 *
 *   model = "gpt-5.4"
 *   model_provider = "holysheep"
 *
 *   [model_providers.holysheep]
 *   name = "HolySheep"
 *   base_url = "https://api.holysheep.ai/v1"
 *   env_key = "OPENAI_API_KEY"
 *
 * 注意：旧的 config.json 会被 Rust Codex 忽略！
 */
const fs   = require('fs')
const path = require('path')
const os   = require('os')

const CONFIG_DIR  = path.join(os.homedir(), '.codex')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.toml')
// 保留 JSON 兼容性（老版本 TypeScript Codex 用）
const CONFIG_FILE_JSON = path.join(CONFIG_DIR, 'config.json')

/**
 * 读取 TOML config（简单解析，不依赖 toml 库）
 */
function readTomlConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return fs.readFileSync(CONFIG_FILE, 'utf8')
    }
  } catch {}
  return ''
}

/**
 * 检查 TOML 里是否已配置 holysheep
 */
function isConfiguredInToml() {
  const content = readTomlConfig()
  return content.includes('model_provider = "holysheep"') &&
         content.includes('base_url') &&
         content.includes('holysheep.ai')
}

/**
 * 写入 TOML config（合并方式：保留已有内容，只更新 holysheep 部分）
 */
function writeTomlConfig(apiKey, baseUrlOpenAI, model) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }

  let content = readTomlConfig()

  // 移除旧的 holysheep 相关配置
  content = content
    .replace(/\nmodel\s*=\s*"[^"]*"\n/g, '\n')
    .replace(/\nmodel_provider\s*=\s*"holysheep"\n/g, '\n')
    .replace(/\[model_providers\.holysheep\][^\[]*(\[|$)/gs, (m, end) => end === '[' ? '[' : '')
    .trim()

  // 在开头插入 holysheep 配置
  const newConfig = [
    `model = "${model || 'gpt-5.4'}"`,
    `model_provider = "holysheep"`,
    '',
    content,
    '',
    `[model_providers.holysheep]`,
    `name = "HolySheep"`,
    `base_url = "${baseUrlOpenAI}"`,
    `env_key = "OPENAI_API_KEY"`,
    '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'

  fs.writeFileSync(CONFIG_FILE, newConfig, 'utf8')
}

/**
 * 同时写 JSON（兼容旧版 TypeScript Codex，如果存在的话）
 */
function writeJsonConfigIfNeeded(apiKey, baseUrlOpenAI, model) {
  try {
    let jsonConfig = {}
    if (fs.existsSync(CONFIG_FILE_JSON)) {
      jsonConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_JSON, 'utf8'))
    }
    jsonConfig.model = model || 'gpt-5.4'
    jsonConfig.provider = 'holysheep'
    if (!jsonConfig.providers) jsonConfig.providers = {}
    jsonConfig.providers.holysheep = {
      name: 'HolySheep',
      baseURL: baseUrlOpenAI,
      envKey: 'OPENAI_API_KEY',
    }
    fs.writeFileSync(CONFIG_FILE_JSON, JSON.stringify(jsonConfig, null, 2), 'utf8')
  } catch {}
}

module.exports = {
  name: 'Codex CLI',
  id: 'codex',
  checkInstalled() {
    return require('../utils/which').commandExists('codex')
  },
  isConfigured() {
    return isConfiguredInToml()
  },
  configure(apiKey, _baseUrlAnthropicNoV1, baseUrlOpenAI) {
    const model = 'gpt-5.4'

    // 写入 TOML（Rust Codex v0.111+ 使用）
    writeTomlConfig(apiKey, baseUrlOpenAI, model)

    // 同时写 JSON（兼容旧版 TypeScript Codex）
    writeJsonConfigIfNeeded(apiKey, baseUrlOpenAI, model)

    return {
      file: CONFIG_FILE,
      hot:  false,
      envVars: {
        OPENAI_API_KEY:   apiKey,
        OPENAI_BASE_URL:  baseUrlOpenAI,
      },
    }
  },
  reset() {
    // 清理 TOML
    if (fs.existsSync(CONFIG_FILE)) {
      let content = readTomlConfig()
      content = content
        .replace(/^model\s*=\s*"[^"]*"\n/m, '')
        .replace(/^model_provider\s*=\s*"holysheep"\n/m, '')
        .replace(/\[model_providers\.holysheep\][^\[]*(\[|$)/gs, (m, end) => end === '[' ? '[' : '')
        .trim() + '\n'
      fs.writeFileSync(CONFIG_FILE, content, 'utf8')
    }
    // 清理 JSON
    if (fs.existsSync(CONFIG_FILE_JSON)) {
      try {
        const c = JSON.parse(fs.readFileSync(CONFIG_FILE_JSON, 'utf8'))
        if (c.provider === 'holysheep') {
          delete c.provider
          delete c.providers?.holysheep
        }
        fs.writeFileSync(CONFIG_FILE_JSON, JSON.stringify(c, null, 2), 'utf8')
      } catch {}
    }
  },
  getConfigPath() { return CONFIG_FILE },
  hint: '切换后重开终端生效；Rust Codex (v0.111+) 使用 config.toml',
  installCmd: 'npm install -g @openai/codex',
  docsUrl: 'https://github.com/openai/codex',
  envVarFormat: 'openai',
}
