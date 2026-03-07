/**
 * Continue.dev 适配器 (VS Code / JetBrains 插件)
 * 配置文件: ~/.continue/config.json
 *
 * Continue 支持自定义 provider，格式:
 * {
 *   "models": [{
 *     "title": "HolySheep Claude",
 *     "provider": "openai",
 *     "model": "claude-sonnet-4-5",
 *     "apiKey": "cr_xxx",
 *     "apiBase": "https://api.holysheep.ai/v1"
 *   }]
 * }
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_FILE = path.join(os.homedir(), '.continue', 'config.json')

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch {}
  return { models: [], tabAutocompleteModel: null }
}

function writeConfig(data) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
}

const HS_MODELS = (apiKey, baseUrl) => [
  {
    title: 'HolySheep — Claude Sonnet',
    provider: 'openai',
    model: 'claude-sonnet-4-5',
    apiKey,
    apiBase: baseUrl,
  },
  {
    title: 'HolySheep — Claude Opus',
    provider: 'openai',
    model: 'claude-opus-4-5',
    apiKey,
    apiBase: baseUrl,
  },
]

module.exports = {
  name: 'Continue.dev',
  id: 'continue',
  checkInstalled() {
    return fs.existsSync(path.join(os.homedir(), '.continue'))
  },
  isConfigured() {
    const c = readConfig()
    return (c.models || []).some(m => m.apiBase?.includes('holysheep'))
  },
  configure(apiKey, baseUrlOpenAI) {
    const config = readConfig()
    // 移除旧的 holysheep models
    config.models = (config.models || []).filter(m => !m.apiBase?.includes('holysheep'))
    // 插入新的
    config.models = [...HS_MODELS(apiKey, baseUrlOpenAI), ...config.models]
    writeConfig(config)
    return { file: CONFIG_FILE, hot: true }
  },
  reset() {
    const config = readConfig()
    config.models = (config.models || []).filter(m => !m.apiBase?.includes('holysheep'))
    writeConfig(config)
  },
  getConfigPath() { return CONFIG_FILE },
  hint: '配置后在 VS Code Continue 面板选择 HolySheep 模型即可使用',
  installCmd: 'VS Code 插件市场搜索 "Continue"',
  docsUrl: 'https://continue.dev',
}
