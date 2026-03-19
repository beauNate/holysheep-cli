#!/usr/bin/env node
'use strict'

const fs = require('fs')
const http = require('http')
const path = require('path')
const os = require('os')
const fetch = global.fetch || require('node-fetch')

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const BRIDGE_CONFIG_FILE = path.join(OPENCLAW_DIR, 'holysheep-bridge.json')

function readBridgeConfig(configPath = BRIDGE_CONFIG_FILE) {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'))
}

function parseArgs(argv) {
  const args = { port: null, host: '127.0.0.1', config: BRIDGE_CONFIG_FILE }
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]
    if (value === '--port') args.port = Number(argv[++i])
    else if (value === '--host') args.host = argv[++i]
    else if (value === '--config') args.config = argv[++i]
  }
  return args
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

function sendOpenAIStream(res, payload) {
  const choice = payload.choices?.[0] || {}
  const message = choice.message || {}
  const created = payload.created || Math.floor(Date.now() / 1000)

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
  })

  const firstChunk = {
    id: payload.id,
    object: 'chat.completion.chunk',
    created,
    model: payload.model,
    choices: [{
      index: 0,
      delta: {
        role: 'assistant',
        ...(message.content ? { content: message.content } : {}),
        ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
      },
      finish_reason: null,
    }],
  }

  const finalChunk = {
    id: payload.id,
    object: 'chat.completion.chunk',
    created,
    model: payload.model,
    choices: [{ index: 0, delta: {}, finish_reason: choice.finish_reason || 'stop' }],
    usage: payload.usage,
  }

  res.write(`data: ${JSON.stringify(firstChunk)}\n\n`)
  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`)
  res.end('data: [DONE]\n\n')
}

function normalizeText(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join('\n')
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text
    if (typeof value.content === 'string') return value.content
  }
  return value == null ? '' : String(value)
}

function parseDataUrl(url) {
  const match = String(url || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mediaType: match[1], data: match[2] }
}

function openAIContentToAnthropicBlocks(content) {
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  if (!Array.isArray(content)) return []

  const blocks = []
  for (const part of content) {
    if (!part) continue
    if (part.type === 'text' && typeof part.text === 'string') {
      blocks.push({ type: 'text', text: part.text })
      continue
    }
    if (part.type === 'image_url' && part.image_url?.url) {
      const dataUrl = parseDataUrl(part.image_url.url)
      if (dataUrl) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: dataUrl.mediaType, data: dataUrl.data },
        })
      }
    }
  }
  return blocks
}

function pushAnthropicMessage(messages, role, blocks) {
  if (!blocks.length) return
  const previous = messages[messages.length - 1]
  if (previous && previous.role === role) {
    previous.content = previous.content.concat(blocks)
    return
  }
  messages.push({ role, content: blocks })
}

function convertOpenAIToAnthropicMessages(messages) {
  const anthropicMessages = []
  const systemParts = []

  for (const message of messages || []) {
    if (!message) continue

    if (message.role === 'system') {
      const blocks = openAIContentToAnthropicBlocks(message.content)
      if (blocks.length === 0) {
        const text = normalizeText(message.content)
        if (text) systemParts.push(text)
      } else {
        for (const block of blocks) {
          if (block.type === 'text') systemParts.push(block.text)
        }
      }
      continue
    }

    if (message.role === 'tool') {
      pushAnthropicMessage(anthropicMessages, 'user', [{
        type: 'tool_result',
        tool_use_id: message.tool_call_id,
        content: normalizeText(message.content),
      }])
      continue
    }

    if (message.role === 'assistant') {
      const blocks = []
      const textBlocks = openAIContentToAnthropicBlocks(message.content)
      if (textBlocks.length) blocks.push(...textBlocks)
      else if (typeof message.content === 'string' && message.content) blocks.push({ type: 'text', text: message.content })

      for (const toolCall of message.tool_calls || []) {
        let input = {}
        try {
          input = JSON.parse(toolCall.function?.arguments || '{}')
        } catch {}
        blocks.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function?.name || 'tool',
          input,
        })
      }

      pushAnthropicMessage(anthropicMessages, 'assistant', blocks)
      continue
    }

    const blocks = openAIContentToAnthropicBlocks(message.content)
    if (blocks.length) pushAnthropicMessage(anthropicMessages, 'user', blocks)
    else {
      const text = normalizeText(message.content)
      if (text) pushAnthropicMessage(anthropicMessages, 'user', [{ type: 'text', text }])
    }
  }

  return {
    system: systemParts.join('\n\n').trim() || undefined,
    messages: anthropicMessages,
  }
}

function convertOpenAIToolsToAnthropic(tools) {
  return (tools || [])
    .filter((tool) => tool?.type === 'function' && tool.function?.name)
    .map((tool) => ({
      name: tool.function.name,
      description: tool.function.description || '',
      input_schema: tool.function.parameters || { type: 'object', properties: {} },
    }))
}

function convertToolChoice(toolChoice) {
  if (!toolChoice || toolChoice === 'auto') return { type: 'auto' }
  if (toolChoice === 'none') return { type: 'auto', disable_parallel_tool_use: true }
  if (toolChoice === 'required') return { type: 'any' }
  if (toolChoice.type === 'function' && toolChoice.function?.name) {
    return { type: 'tool', name: toolChoice.function.name }
  }
  return { type: 'auto' }
}

function buildAnthropicPayload(requestBody) {
  const converted = convertOpenAIToAnthropicMessages(requestBody.messages)
  const payload = {
    model: requestBody.model,
    max_tokens: requestBody.max_tokens || requestBody.max_completion_tokens || requestBody.max_output_tokens || 4096,
    messages: converted.messages,
    stream: false,
  }

  if (converted.system) payload.system = converted.system
  if (requestBody.temperature != null) payload.temperature = requestBody.temperature
  if (requestBody.top_p != null) payload.top_p = requestBody.top_p
  if (Array.isArray(requestBody.stop) && requestBody.stop.length) payload.stop_sequences = requestBody.stop
  if (typeof requestBody.stop === 'string') payload.stop_sequences = [requestBody.stop]

  const tools = convertOpenAIToolsToAnthropic(requestBody.tools)
  if (tools.length) payload.tools = tools
  if (requestBody.tool_choice) payload.tool_choice = convertToolChoice(requestBody.tool_choice)

  return payload
}

function mapFinishReason(stopReason) {
  if (stopReason === 'tool_use') return 'tool_calls'
  if (stopReason === 'max_tokens') return 'length'
  return 'stop'
}

function buildToolCalls(content) {
  const calls = []
  for (const block of content || []) {
    if (block?.type !== 'tool_use') continue
    calls.push({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input || {}),
      },
    })
  }
  return calls
}

function anthropicToOpenAIResponse(responseBody, requestedModel) {
  const text = (responseBody.content || [])
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('')
  const toolCalls = buildToolCalls(responseBody.content)

  return {
    id: responseBody.id || `chatcmpl_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      },
      finish_reason: mapFinishReason(responseBody.stop_reason),
    }],
    usage: responseBody.usage
      ? {
          prompt_tokens: responseBody.usage.input_tokens || 0,
          completion_tokens: responseBody.usage.output_tokens || 0,
          total_tokens: (responseBody.usage.input_tokens || 0) + (responseBody.usage.output_tokens || 0),
        }
      : undefined,
  }
}

function pickRoute(model) {
  if (String(model).startsWith('gpt-')) return 'openai'
  if (String(model).startsWith('claude-')) return 'anthropic'
  if (String(model).startsWith('MiniMax-')) return 'minimax'
  return 'openai'
}

function parseOpenAIStreamText(text) {
  try {
    const parsed = JSON.parse(String(text || ''))
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}

  const blocks = String(text || '').split(/\r?\n\r?\n+/).filter(Boolean)
  let responseCompleted = null
  let finalChunk = null
  let content = ''
  let sawOutputTextDelta = false

  for (const block of blocks) {
    const eventMatch = block.match(/^event:\s*(.+)$/m)
    const dataMatch = block.match(/^data:\s*(.+)$/m)
    if (!dataMatch) continue

    const eventName = eventMatch ? eventMatch[1].trim() : ''
    const payload = dataMatch[1].trim()
    if (!payload || payload === '[DONE]') continue

    let chunk
    try {
      chunk = JSON.parse(payload)
    } catch {
      continue
    }

    if (eventName === 'response.output_text.delta' && typeof chunk.delta === 'string') {
      sawOutputTextDelta = true
      content += chunk.delta
      continue
    }

    if (eventName === 'response.content_part.done' && chunk.part?.type === 'output_text' && typeof chunk.part.text === 'string') {
      if (!sawOutputTextDelta) content += chunk.part.text
      continue
    }

    if (eventName === 'response.completed' && chunk.response) {
      responseCompleted = chunk.response
      if (!content) {
        const outputText = (chunk.response.output || [])
          .flatMap((item) => item?.content || [])
          .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
          .map((item) => item.text)
          .join('')
        if (outputText) content = outputText
      }
      continue
    }

    finalChunk = chunk
    const choice = chunk.choices?.[0] || {}
    const delta = choice.delta || {}
    if (delta.content) content += delta.content
    else if (choice.message?.content) content += choice.message.content
  }

  if (responseCompleted) {
    return {
      id: responseCompleted.id || `chatcmpl_${Date.now()}`,
      object: 'chat.completion',
      created: responseCompleted.created_at || Math.floor(Date.now() / 1000),
      model: responseCompleted.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: content || null },
        finish_reason: responseCompleted.status === 'completed' ? 'stop' : 'length',
      }],
      usage: responseCompleted.usage,
    }
  }

  if (!finalChunk) return null

  return {
    id: finalChunk.id || `chatcmpl_${Date.now()}`,
    object: 'chat.completion',
    created: finalChunk.created || Math.floor(Date.now() / 1000),
    model: finalChunk.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: content || null },
      finish_reason: finalChunk.choices?.[0]?.finish_reason || 'stop',
    }],
    usage: finalChunk.usage,
  }
}

async function relayOpenAIRequest(requestBody, config, res) {
  const upstreamBody = {
    ...requestBody,
    stream: requestBody.stream === true,
  }
  const upstream = await fetch(`${config.baseUrlOpenAI.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
      'user-agent': 'holysheep-openclaw-bridge/1.0',
    },
    body: JSON.stringify(upstreamBody),
  })

  const text = await upstream.text()
  const parsed = parseOpenAIStreamText(text)
  if (upstream.ok && parsed) {
    if (requestBody.stream) return sendOpenAIStream(res, parsed)
    return sendJson(res, upstream.status, parsed)
  }

  res.writeHead(upstream.status, {
    'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    'cache-control': upstream.headers.get('cache-control') || 'no-store',
  })
  res.end(text)
}

async function relayAnthropicRequest(requestBody, config, route, res) {
  const payload = buildAnthropicPayload(requestBody)
  const baseUrl = route === 'minimax'
    ? `${config.baseUrlAnthropic.replace(/\/+$/, '')}/minimax/v1/messages`
    : `${config.baseUrlAnthropic.replace(/\/+$/, '')}/v1/messages`

  const upstream = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'user-agent': 'holysheep-openclaw-bridge/1.0',
    },
    body: JSON.stringify(payload),
  })

  const text = await upstream.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { error: { message: text || 'Invalid upstream response' } }
  }

  if (!upstream.ok) {
    return sendJson(res, upstream.status, body)
  }

  const openaiBody = anthropicToOpenAIResponse(body, requestBody.model)
  if (requestBody.stream) return sendOpenAIStream(res, openaiBody)
  return sendJson(res, 200, openaiBody)
}

function buildModelsResponse(config) {
  return {
    object: 'list',
    data: (config.models || []).map((model) => ({
      id: model,
      object: 'model',
      owned_by: 'holysheep',
    })),
  }
}

function createBridgeServer(configPath = BRIDGE_CONFIG_FILE) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization,x-api-key,anthropic-version',
      })
      return res.end()
    }

    try {
      const config = readBridgeConfig(configPath)
      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`)

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true, port: config.port, models: config.models || [] })
      }

      if (req.method === 'GET' && url.pathname === '/v1/models') {
        return sendJson(res, 200, buildModelsResponse(config))
      }

      if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
        const requestBody = await readJsonBody(req)
        const route = pickRoute(requestBody.model)
        if (route === 'openai') return relayOpenAIRequest(requestBody, config, res)
        return relayAnthropicRequest(requestBody, config, route, res)
      }

      return sendJson(res, 404, { error: { message: 'Not found' } })
    } catch (error) {
      return sendJson(res, 500, { error: { message: error.message || 'Bridge error' } })
    }
  })
}

function startBridge(args = parseArgs(process.argv.slice(2))) {
  const config = readBridgeConfig(args.config)
  const port = args.port || config.port
  const host = args.host || '127.0.0.1'
  const server = createBridgeServer(args.config)

  server.listen(port, host, () => {
    process.stdout.write(`HolySheep OpenClaw bridge listening on http://${host}:${port}\n`)
  })

  return server
}

if (require.main === module) {
  startBridge()
}

module.exports = {
  BRIDGE_CONFIG_FILE,
  buildAnthropicPayload,
  anthropicToOpenAIResponse,
  buildModelsResponse,
  createBridgeServer,
  parseArgs,
  parseOpenAIStreamText,
  pickRoute,
  readBridgeConfig,
  startBridge,
}
