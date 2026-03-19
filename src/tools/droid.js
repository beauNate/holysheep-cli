/**
 * Droid CLI 适配器
 * 配置文件: ~/.factory/settings.json
 *
 * 使用 Droid 原生 customModels 配置 HolySheep 的多个模型入口：
 * - GPT 走 OpenAI 兼容入口:   https://api.holysheep.ai/v1
 * - Claude 走 Anthropic 入口: https://api.holysheep.ai
 * - MiniMax 走 Anthropic 入口: https://api.holysheep.ai/minimax
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_DIR = path.join(os.homedir(), '.factory')
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json')
const LEGACY_CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_MODELS = [
  {
    model: 'gpt-5.4',
    id: 'custom:gpt-5.4-0',
    baseUrlSuffix: '',
    displayName: 'GPT-5.4',
    provider: 'openai',
  },
  {
    model: 'claude-sonnet-4-6',
    id: 'custom:claude-sonnet-4-6-0',
    baseUrlSuffix: '',
    displayName: 'Sonnet 4.6',
    provider: 'anthropic',
  },
  {
    model: 'claude-opus-4-6',
    id: 'custom:claude-opus-4-6-0',
    baseUrlSuffix: '',
    displayName: 'Opus 4.6',
    provider: 'anthropic',
  },
  {
    model: 'MiniMax-M2.7-highspeed',
    id: 'custom:MiniMax-M2.7-highspeed-0',
    baseUrlSuffix: '/minimax',
    displayName: 'MiniMax 2.7 Highspeed',
    provider: 'anthropic',
  },
  {
    model: 'claude-haiku-4-5',
    id: 'custom:claude-haiku-4-5-0',
    baseUrlSuffix: '',
    displayName: 'Haiku 4.5',
    provider: 'anthropic',
  },
]

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function writeSettings(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function readLegacyConfig() {
  try {
    if (fs.existsSync(LEGACY_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(LEGACY_CONFIG_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function writeLegacyConfig(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(LEGACY_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function isHolySheepModel(item) {
  return typeof item?.baseUrl === 'string' && item.baseUrl.includes('api.holysheep.ai')
}

function normalizeSelectedModels(selectedModels) {
  const selected = new Set(
    Array.isArray(selectedModels) && selectedModels.length > 0
      ? selectedModels
      : DEFAULT_MODELS.map((item) => item.model)
  )
  const models = DEFAULT_MODELS.filter((item) => selected.has(item.model)).map((item, index) => ({
    model: item.model,
    id: item.id,
    index,
    baseUrlSuffix: item.baseUrlSuffix,
    displayName: item.displayName,
    provider: item.provider,
  }))

  return models.length > 0 ? models : DEFAULT_MODELS.map((item, index) => ({ ...item, index }))
}

function buildCustomModels(apiKey, baseUrlAnthropic, baseUrlOpenAI, selectedModels) {
  const anthropicRootUrl = String(baseUrlAnthropic || '').replace(/\/+$/, '')
  const openaiRootUrl = String(baseUrlOpenAI || '').replace(/\/+$/, '')
  return normalizeSelectedModels(selectedModels).map((item) => ({
    model: item.model,
    id: item.id,
    index: item.index,
    baseUrl:
      item.provider === 'openai'
        ? `${openaiRootUrl}${item.baseUrlSuffix}`
        : `${anthropicRootUrl}${item.baseUrlSuffix}`,
    apiKey,
    displayName: item.displayName,
    maxOutputTokens: 64000,
    noImageSupport: true,
    provider: item.provider,
  }))
}

module.exports = {
  name: 'Droid CLI',
  id: 'droid',
  checkInstalled() {
    return require('../utils/which').commandExists('droid')
  },
  isConfigured() {
    const settings = readSettings()
    const customModels = Array.isArray(settings.customModels) ? settings.customModels : []
    if (customModels.some(isHolySheepModel)) return true

    const legacy = readLegacyConfig()
    const legacyModels = Array.isArray(legacy.customModels) ? legacy.customModels : []
    return legacyModels.some(isHolySheepModel)
  },
  configure(apiKey, baseUrlAnthropic, baseUrlOpenAI, _primaryModel, selectedModels) {
    const nextModels = buildCustomModels(apiKey, baseUrlAnthropic, baseUrlOpenAI, selectedModels)

    const settings = readSettings()
    const preservedModels = Array.isArray(settings.customModels)
      ? settings.customModels.filter((item) => !isHolySheepModel(item))
      : []
    settings.customModels = [
      ...nextModels,
      ...preservedModels,
    ]
    settings.logoAnimation = 'off'
    writeSettings(settings)

    const legacy = readLegacyConfig()
    const preservedLegacyModels = Array.isArray(legacy.customModels)
      ? legacy.customModels.filter((item) => !isHolySheepModel(item))
      : []
    legacy.customModels = [
      ...nextModels,
      ...preservedLegacyModels,
    ]
    legacy.logoAnimation = 'off'
    writeLegacyConfig(legacy)

    return {
      file: SETTINGS_FILE,
      hot: true,
    }
  },
  reset() {
    const settings = readSettings()
    if (Array.isArray(settings.customModels)) {
      settings.customModels = settings.customModels.filter((item) => !isHolySheepModel(item))
    }
    writeSettings(settings)

    const legacy = readLegacyConfig()
    if (Array.isArray(legacy.customModels)) {
      legacy.customModels = legacy.customModels.filter((item) => !isHolySheepModel(item))
    }
    writeLegacyConfig(legacy)
  },
  getConfigPath() { return SETTINGS_FILE },
  hint: '已写入 ~/.factory/settings.json；重启 Droid 后可见 HolySheep 模型列表',
  launchCmd: 'droid',
  installCmd: 'brew install --cask droid',
  docsUrl: 'https://docs.factory.ai/cli/getting-started/overview',
}
