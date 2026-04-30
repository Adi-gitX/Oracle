import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { decryptData, encryptData, isEncryptionAvailable } from '../../utils/encryption'

type ChatContext = Array<Record<string, unknown>>
export type ChatModelPreference = 'fast' | 'quality'

interface ChatBody {
  payload?: string
  isEncrypted?: boolean
  message?: string
  context?: ChatContext
  modelPreference?: ChatModelPreference
  modelId?: string
}

interface RateLimitRecord {
  count: number
  windowStart: number
  lastSeen: number
}

interface ModelSelection {
  primary: string
  fallback?: string
}

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 1000
const RATE_TTL_MS = 10 * 60 * 1000
const RATE_MAX_ENTRIES = 5000

function trimContext(rawContext: unknown): ChatContext {
  if (!Array.isArray(rawContext)) return []
  return rawContext.filter((item) => item && typeof item === 'object').slice(0, 50) as ChatContext
}

function normalizePreference(value: unknown): ChatModelPreference {
  return value === 'quality' ? 'quality' : 'fast'
}

function parseAllowedModels(): string[] {
  return (process.env.ORACLE_CHAT_ALLOWED_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function getChatModels(): { fast: string; quality: string; allowed: string[] } {
  return {
    fast: (process.env.ORACLE_CHAT_MODEL_FAST || 'gemini-2.5-flash').trim(),
    quality: (process.env.ORACLE_CHAT_MODEL_QUALITY || 'gemini-2.5-pro').trim(),
    allowed: parseAllowedModels()
  }
}

export function resolveModelSelection(preference: unknown, modelId: unknown): ModelSelection {
  const models = getChatModels()
  const normalizedPreference = normalizePreference(preference)

  if (typeof modelId === 'string' && modelId.trim().length > 0) {
    const requested = modelId.trim()
    if (!models.allowed.includes(requested)) {
      throw new Error('Requested model is not in ORACLE_CHAT_ALLOWED_MODELS allowlist.')
    }
    return { primary: requested }
  }

  if (normalizedPreference === 'quality') {
    return {
      primary: models.quality,
      fallback: models.fast !== models.quality ? models.fast : undefined
    }
  }

  return { primary: models.fast }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorStatus(error: unknown): number {
  if (!isObject(error) || !('status' in error)) return 0
  return Number((error as { status?: number }).status || 0)
}

function getErrorMessage(error: unknown): string {
  if (!isObject(error) || !('message' in error)) return ''
  return String((error as { message?: string }).message || '')
}

function shouldFallbackModel(error: unknown): boolean {
  const status = getErrorStatus(error)
  const message = getErrorMessage(error).toLowerCase()

  return (
    status === 429 ||
    status === 404 ||
    status === 503 ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('unavailable') ||
    message.includes('not found') ||
    message.includes('model')
  )
}

function shouldTryNextKey(error: unknown): boolean {
  const status = getErrorStatus(error)
  const message = getErrorMessage(error).toLowerCase()

  return (
    status === 429 ||
    status === 401 ||
    status === 403 ||
    message.includes('quota') ||
    message.includes('429') ||
    message.includes('permission')
  )
}

export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim()
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0]?.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim()
  }

  return req.socket.remoteAddress || 'unknown'
}

function getRateMap(): Map<string, RateLimitRecord> {
  if (!global.chatRateLimitMap) {
    global.chatRateLimitMap = new Map<string, RateLimitRecord>()
  }
  return global.chatRateLimitMap
}

function pruneRateLimitMap(map: Map<string, RateLimitRecord>, now: number): void {
  for (const [ip, record] of Array.from(map.entries())) {
    if (now - record.lastSeen > RATE_TTL_MS) {
      map.delete(ip)
    }
  }

  if (map.size <= RATE_MAX_ENTRIES) return

  const overflow = map.size - RATE_MAX_ENTRIES
  const oldest = Array.from(map.entries())
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    .slice(0, overflow)

  for (const [ip] of oldest) {
    map.delete(ip)
  }
}

export function applyRateLimit(ip: string): boolean {
  const now = Date.now()
  const map = getRateMap()
  pruneRateLimitMap(map, now)

  const existing = map.get(ip)
  const withinWindow = existing && now - existing.windowStart <= RATE_WINDOW_MS

  const record: RateLimitRecord = withinWindow
    ? {
        count: existing.count + 1,
        windowStart: existing.windowStart,
        lastSeen: now
      }
    : {
        count: 1,
        windowStart: now,
        lastSeen: now
      }

  map.set(ip, record)
  return record.count <= RATE_LIMIT
}

export function getApiKeys(): string[] {
  const keyRows: Array<{ index: number; value: string }> = []
  const keyPattern = /^(GOOGLE|GEMINI)_API_KEY(?:_(\d+))?$/

  for (const [name, value] of Object.entries(process.env)) {
    const match = name.match(keyPattern)
    if (!match || !value) continue

    const parsedIndex = match[2] ? Number(match[2]) : 0
    const index = Number.isFinite(parsedIndex) ? parsedIndex : 0
    keyRows.push({ index, value: value.trim() })
  }

  return keyRows
    .sort((a, b) => a.index - b.index)
    .map((row) => row.value)
    .filter((value, idx, arr) => value.length > 0 && arr.indexOf(value) === idx)
}

function jsonError(res: NextApiResponse, status: number, code: string, message: string): void {
  res.status(status).json({
    message,
    error: { code, message }
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }

  const ip = getClientIp(req)
  if (!applyRateLimit(ip)) {
    return jsonError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again in a minute.')
  }

  const apiKeys = getApiKeys()

  // BYOK: user can supply their own Gemini key via X-Oracle-LLM-Key header.
  // We prefer the user's key if present, falling back to the server's key list.
  const rawByok = req.headers['x-oracle-llm-key']
  const byokKey = (Array.isArray(rawByok) ? rawByok[0] : rawByok || '').trim()
  const isValidByok = /^AIza[A-Za-z0-9_-]{20,}$/.test(byokKey)
  const effectiveKeys = isValidByok ? [byokKey] : apiKeys

  // Rate limit: ONLY for users on the shared server key. BYOK users are unlimited.
  if (!isValidByok) {
    const { rateLimit, getClientIp } = await import('../../lib/RateLimit')
    const ip = getClientIp(req)
    const FREE_LIMIT = parseInt(process.env.ORACLE_CHAT_FREE_LIMIT || '15', 10)
    const FREE_WINDOW_MS = parseInt(process.env.ORACLE_CHAT_FREE_WINDOW_MS || `${60 * 60 * 1000}`, 10) // 1h default
    const rl = rateLimit(`chat:${ip}`, FREE_LIMIT, FREE_WINDOW_MS)
    res.setHeader('X-RateLimit-Limit', String(rl.limit))
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)))
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfterSec))
      const minutes = Math.max(1, Math.ceil(rl.retryAfterSec / 60))
      return jsonError(
        res,
        429,
        'RATE_LIMITED',
        `You've hit the free limit (${FREE_LIMIT} chats/hour on the shared key). Add your own free Gemini key via Settings (⌘K → "API Key Settings") for unlimited use, or try again in ~${minutes} min.`
      )
    }
  }

  if (effectiveKeys.length === 0) {
    return jsonError(
      res,
      503,
      'MISSING_API_KEYS',
      'AI chat is currently unavailable. Either the server admin needs to configure GOOGLE_API_KEY or you can paste your own Gemini key via Settings (⌘K → "API Key Settings").'
    )
  }

  const body = (req.body || {}) as ChatBody
  let message = body.message
  let context = trimContext(body.context)
  let modelPreference: ChatModelPreference = normalizePreference(body.modelPreference)
  let modelId = typeof body.modelId === 'string' ? body.modelId : undefined
  const expectsEncryptedResponse = Boolean(body.isEncrypted)

  if (body.isEncrypted) {
    if (!isEncryptionAvailable()) {
      return jsonError(res, 400, 'ENCRYPTION_UNAVAILABLE', 'Encrypted mode is not available on this server.')
    }

    if (!body.payload) {
      return jsonError(res, 400, 'MISSING_PAYLOAD', 'Missing encrypted payload.')
    }

    try {
      const decrypted = decryptData(body.payload)
      const parsed = JSON.parse(decrypted)
      message = typeof parsed.message === 'string' ? parsed.message : undefined
      context = trimContext(parsed.context)
      modelPreference = normalizePreference(parsed.modelPreference)
      modelId = typeof parsed.modelId === 'string' ? parsed.modelId : undefined
    } catch {
      return jsonError(res, 400, 'ENCRYPTION_ERROR', 'Encryption Error')
    }
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return jsonError(res, 400, 'INVALID_MESSAGE', 'Message is required.')
  }

  let modelSelection: ModelSelection
  try {
    modelSelection = resolveModelSelection(modelPreference, modelId)
  } catch (error) {
    return jsonError(
      res,
      400,
      'MODEL_NOT_ALLOWED',
      error instanceof Error ? error.message : 'Invalid model selection.'
    )
  }

  const prompt = `
You are Oracle, an elite API security consultant.
Your goal is to help developers verify, debug, and manage their API credentials.

CONTEXT:
${
  context.length > 0
    ? `The user has verified these keys in this session:\n${JSON.stringify(context, null, 2)}`
    : 'No keys have been verified in this session yet.'
}

USER MESSAGE:
"${message.trim()}"

INSTRUCTIONS:
1. be concise, professional, and helpful.
2. format responses using Markdown (bold for emphasis, code blocks for code/keys, lists for steps).
3. If the user asks about the keys above, analyze them based on the provided JSON data.
4. If the user asks general tech questions, answer them briefly.
5. Do not invent keys. Only discuss keys provided in context or by the user.
`

  let lastError: unknown = null

  keyLoop: for (const key of effectiveKeys) {
    const genAI = new GoogleGenerativeAI(key)
    const modelChain = [modelSelection.primary, modelSelection.fallback].filter(Boolean) as string[]

    for (let index = 0; index < modelChain.length; index += 1) {
      const modelName = modelChain[index]

      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        const payload = { reply: text, modelUsed: modelName }

        if (expectsEncryptedResponse && isEncryptionAvailable()) {
          const encryptedResponse = encryptData(JSON.stringify(payload))
          return res.status(200).json({ payload: encryptedResponse, isEncrypted: true })
        }

        return res.status(200).json(payload)
      } catch (error: unknown) {
        lastError = error

        const isPrimary = index === 0
        if (isPrimary && modelSelection.fallback && shouldFallbackModel(error)) {
          continue
        }

        if (shouldTryNextKey(error)) {
          continue keyLoop
        }

        break
      }
    }
  }

  const statusFromError = getErrorStatus(lastError)
  const status = statusFromError > 0 ? statusFromError : 500
  const errorMessage = getErrorMessage(lastError) || 'Error communicating with AI service'

  return jsonError(res, status, 'UPSTREAM_ERROR', errorMessage)
}

declare global {
  var chatRateLimitMap: Map<string, RateLimitRecord> | undefined
}
