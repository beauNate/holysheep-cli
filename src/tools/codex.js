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
 *   api_key = "cr_xxx"
 *
 * 注意：旧的 config.json 会被 Rust Codex 忽略！
 * 注意：使用 api_key 而非 env_key，避免 Windows 上需要重启终端才能生效的问题
 */
const fs   = require('fs')
const path = require('path')
const os   = require('os')

const CONFIG_DIR  = path.join(os.homedir(), '.codex')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.toml')
// 保留 JSON 兼容性（老版本 TypeScript Codex 用）
const CONFIG_FILE_JSON = path.join(CONFIG_DIR, 'config.json')

function normalizeToml(content) {
  return String(content || '').replace(/\r\n/g, '\n')
}

function cleanupToml(content) {
  return normalizeToml(content)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripManagedTomlConfig(content) {
  const lines = normalizeToml(content).split('\n')
  const output = []
  let currentSection = null
  let skipHolySheepBlock = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (/^\[[^\]]+\]$/.test(trimmed)) {
      if (trimmed === '[model_providers.holysheep]') {
        currentSection = trimmed
        skipHolySheepBlock = true
        continue
      }

      currentSection = trimmed
      skipHolySheepBlock = false
    }

    if (skipHolySheepBlock) continue

    if (!currentSection) {
      if (/^model\s*=\s*"[^"]*"\s*$/.test(trimmed)) continue
      if (/^model_provider\s*=\s*"holysheep"\s*$/.test(trimmed)) continue
    }

    output.push(line)
  }

  return cleanupToml(output.join('\n'))
}

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

  const content = stripManagedTomlConfig(readTomlConfig())

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
    `api_key = "${apiKey}"`,
    '',
  ].join('\n')

  fs.writeFileSync(CONFIG_FILE, cleanupToml(newConfig) + '\n', 'utf8')
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
    jsonConfig.model_provider = 'holysheep'
    jsonConfig.provider = 'holysheep'
    if (!jsonConfig.model_providers) jsonConfig.model_providers = {}
    if (!jsonConfig.providers) jsonConfig.providers = {}
    jsonConfig.model_providers.holysheep = {
      name: 'HolySheep',
      base_url: baseUrlOpenAI,
      api_key: apiKey,
    }
    jsonConfig.providers.holysheep = {
      name: 'HolySheep',
      baseURL: baseUrlOpenAI,
      apiKey,
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
      const content = stripManagedTomlConfig(readTomlConfig())
      fs.writeFileSync(CONFIG_FILE, (content ? content + '\n' : ''), 'utf8')
    }
    // 清理 JSON
    if (fs.existsSync(CONFIG_FILE_JSON)) {
      try {
        const c = JSON.parse(fs.readFileSync(CONFIG_FILE_JSON, 'utf8'))
        if (c.model_provider === 'holysheep') {
          delete c.model_provider
        }
        if (c.provider === 'holysheep') {
          delete c.provider
        }
        delete c.model_providers?.holysheep
        delete c.providers?.holysheep
        if (c.model_providers && Object.keys(c.model_providers).length === 0) delete c.model_providers
        if (c.providers && Object.keys(c.providers).length === 0) delete c.providers
        fs.writeFileSync(CONFIG_FILE_JSON, JSON.stringify(c, null, 2), 'utf8')
      } catch {}
    }
  },
  getConfigPath() { return CONFIG_FILE },
  hint: '切换后重开终端生效；Rust Codex (v0.111+) 使用 config.toml',
  launchCmd: 'codex',
  installCmd: 'npm install -g @openai/codex',
  docsUrl: 'https://github.com/openai/codex',
  envVarFormat: 'openai',
}
