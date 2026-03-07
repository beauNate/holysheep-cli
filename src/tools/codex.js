/**
 * OpenAI Codex CLI 适配器
 * 配置文件: ~/.codex/config.yaml 或 ~/.codex/config.json
 * 环境变量: OPENAI_API_KEY, OPENAI_BASE_URL
 *
 * Codex 支持 custom provider 配置:
 *   providers:
 *     - name: HolySheep
 *       baseURL: https://api.holysheep.ai/v1
 *       envKey: OPENAI_API_KEY
 *
 * 注意: Codex 用 OpenAI 兼容格式，baseURL 需带 /v1
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_DIR  = path.join(os.homedir(), '.codex')
const CONFIG_YAML = path.join(CONFIG_DIR, 'config.yaml')
const CONFIG_JSON = path.join(CONFIG_DIR, 'config.json')

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_YAML)) return { type: 'yaml', content: fs.readFileSync(CONFIG_YAML, 'utf8') }
    if (fs.existsSync(CONFIG_JSON)) return { type: 'json', content: fs.readFileSync(CONFIG_JSON, 'utf8') }
  } catch {}
  return { type: 'yaml', content: '' }
}

function removeHolysheepProvider(yamlContent) {
  // 简单移除已有的 holysheep provider 块
  const lines = yamlContent.split('\n')
  const result = []
  let skip = false
  for (const line of lines) {
    if (line.includes('HolySheep') || line.includes('holysheep')) {
      skip = true
      // 也移除上一行的 `- name:` 前缀
      if (result.length && result[result.length - 1].trim().startsWith('- name:')) {
        result.pop()
      }
      continue
    }
    if (skip && (line.startsWith('  ') || line.trim() === '')) {
      if (line.trim() === '') skip = false
      continue
    }
    skip = false
    result.push(line)
  }
  return result.join('\n')
}

module.exports = {
  name: 'Codex CLI',
  id: 'codex',
  checkInstalled() {
    try {
      require('child_process').execSync('which codex', { stdio: 'ignore' })
      return true
    } catch { return false }
  },
  isConfigured() {
    const { content } = readConfig()
    return content.includes('holysheep') || content.includes('HolySheep')
  },
  configure(apiKey, baseUrlOpenAI) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })

    // 生成 YAML 格式配置（Codex 官方推荐）
    let content = ''
    if (fs.existsSync(CONFIG_YAML)) {
      content = fs.readFileSync(CONFIG_YAML, 'utf8')
      content = removeHolysheepProvider(content)
    }

    // 追加 holysheep provider + 设为默认 model provider
    const providerBlock = `
# HolySheep API — https://shop.holysheep.ai
providers:
  - name: HolySheep
    baseURL: ${baseUrlOpenAI}
    envKey: OPENAI_API_KEY
model: claude-sonnet-4-5
`
    // 如果已有 providers 块，改为追加到列表
    if (content.includes('providers:')) {
      content = content.replace('providers:', `providers:\n  - name: HolySheep\n    baseURL: ${baseUrlOpenAI}\n    envKey: OPENAI_API_KEY`)
    } else {
      content += providerBlock
    }

    fs.writeFileSync(CONFIG_YAML, content.trim() + '\n', 'utf8')

    // 同时写入环境变量（Codex 通过 envKey 读取）
    return {
      file: CONFIG_YAML,
      hot: false,
      envVars: {
        OPENAI_API_KEY: apiKey,
        OPENAI_BASE_URL: baseUrlOpenAI,
      },
    }
  },
  reset() {
    if (fs.existsSync(CONFIG_YAML)) {
      let content = fs.readFileSync(CONFIG_YAML, 'utf8')
      content = removeHolysheepProvider(content)
      fs.writeFileSync(CONFIG_YAML, content, 'utf8')
    }
  },
  getConfigPath() { return CONFIG_YAML },
  hint: '切换后需重启终端或新开 terminal',
  installCmd: 'npm install -g @openai/codex',
  docsUrl: 'https://github.com/openai/codex',
  envVarFormat: 'openai',  // 告知 setup 命令写哪些 env vars
}
