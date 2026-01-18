// Smart Request Parser - Analyzes user input and builds API request

import type { RequestConfig, HttpMethod, KeyValue } from './types'
import { parseCurl, isCurlCommand } from './CurlParser'

interface ParsedRequest {
    config: RequestConfig
    confidence: 'high' | 'medium' | 'low'
    detectedType: 'curl' | 'url' | 'natural' | 'json'
    summary: string
}

/**
 * Smart parser that analyzes user input and builds a request config
 * Supports: cURL commands, raw URLs, JSON configs, natural language
 */
export function parseUserInput(input: string): ParsedRequest {
    const trimmed = input.trim()

    // 1. Check if it's a cURL command
    if (isCurlCommand(trimmed)) {
        try {
            const config = parseCurl(trimmed)
            return {
                config,
                confidence: 'high',
                detectedType: 'curl',
                summary: `${config.method} request to ${extractDomain(config.url)}`
            }
        } catch (e) {
            // Fall through to other parsers
        }
    }

    // 2. Check if it's a JSON config
    if (trimmed.startsWith('{')) {
        try {
            const json = JSON.parse(trimmed)
            const config = parseJsonConfig(json)
            return {
                config,
                confidence: 'high',
                detectedType: 'json',
                summary: `${config.method} request to ${extractDomain(config.url)}`
            }
        } catch (e) {
            // Fall through
        }
    }

    // 3. Check if it looks like a URL (with optional method prefix)
    const urlMatch = trimmed.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)?\s*(https?:\/\/[^\s]+)/i)
    if (urlMatch) {
        const method = (urlMatch[1]?.toUpperCase() || 'GET') as HttpMethod
        const url = urlMatch[2]

        // Check for headers/body after the URL
        const { headers, body } = parseInlineOptions(trimmed.substring(urlMatch[0].length))

        return {
            config: {
                method,
                url: normalizeUrl(url),
                headers,
                params: extractQueryParams(url),
                auth: { type: 'none' },
                body: body ? { type: 'json', raw: body } : { type: 'none' }
            },
            confidence: 'high',
            detectedType: 'url',
            summary: `${method} request to ${extractDomain(url)}`
        }
    }

    // 4. Try natural language parsing
    return parseNaturalLanguage(trimmed)
}

/**
 * Parse natural language into a request
 * Examples:
 * - "GET all users from jsonplaceholder"
 * - "POST to api.example.com/users with name John"
 * - "send a request to httpbin.org/get"
 */
function parseNaturalLanguage(input: string): ParsedRequest {
    const lower = input.toLowerCase()

    // Detect method
    let method: HttpMethod = 'GET'
    if (/\b(post|create|add|submit|send data)\b/i.test(lower)) method = 'POST'
    else if (/\b(put|update|replace)\b/i.test(lower)) method = 'PUT'
    else if (/\b(patch|modify)\b/i.test(lower)) method = 'PATCH'
    else if (/\b(delete|remove)\b/i.test(lower)) method = 'DELETE'

    // Try to extract URL or domain
    let url = ''

    // Common API patterns
    const apiPatterns = [
        { pattern: /jsonplaceholder/i, url: 'https://jsonplaceholder.typicode.com' },
        { pattern: /httpbin/i, url: 'https://httpbin.org' },
        { pattern: /reqres/i, url: 'https://reqres.in/api' },
        { pattern: /dummyjson/i, url: 'https://dummyjson.com' },
    ]

    for (const { pattern, url: baseUrl } of apiPatterns) {
        if (pattern.test(lower)) {
            url = baseUrl
            break
        }
    }

    // Try to find URL-like patterns
    const domainMatch = input.match(/(?:to|from|at)?\s*([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i)
    if (domainMatch) {
        url = 'https://' + domainMatch[1]
    }

    // Try to find path patterns
    const pathPatterns = [
        { pattern: /\busers?\b/i, path: '/users' },
        { pattern: /\bposts?\b/i, path: '/posts' },
        { pattern: /\bcomments?\b/i, path: '/comments' },
        { pattern: /\btodos?\b/i, path: '/todos' },
        { pattern: /\bproducts?\b/i, path: '/products' },
        { pattern: /\bget\b/i, path: '/get' },
        { pattern: /\bpost\b/i, path: '/post' },
    ]

    for (const { pattern, path } of pathPatterns) {
        if (pattern.test(lower) && url && !url.includes(path)) {
            // Check if there's a number after (like "post 1")
            const numMatch = lower.match(new RegExp(pattern.source + '\\s*(\\d+)', 'i'))
            if (numMatch) {
                url += path + '/' + numMatch[1]
            } else {
                url += path
            }
            break
        }
    }

    // Extract body from "with" clause
    let body: string | undefined
    const withMatch = input.match(/\bwith\s+(.+)$/i)
    if (withMatch && method !== 'GET') {
        const bodyText = withMatch[1].trim()
        // Try to create JSON from key-value pairs
        if (bodyText.includes(':') || bodyText.includes('=')) {
            try {
                const pairs = bodyText.split(/[,&]/).map(pair => {
                    const [key, value] = pair.split(/[:=]/).map(s => s.trim())
                    return [key.replace(/['"]/g, ''), value?.replace(/['"]/g, '') || '']
                })
                body = JSON.stringify(Object.fromEntries(pairs), null, 2)
            } catch {
                body = JSON.stringify({ data: bodyText })
            }
        } else {
            body = JSON.stringify({ data: bodyText })
        }
    }

    if (!url) {
        // Default fallback
        url = 'https://httpbin.org/' + (method === 'GET' ? 'get' : method.toLowerCase())
    }

    return {
        config: {
            method,
            url,
            headers: [],
            params: [],
            auth: { type: 'none' },
            body: body ? { type: 'json', raw: body } : { type: 'none' }
        },
        confidence: 'medium',
        detectedType: 'natural',
        summary: `${method} request to ${extractDomain(url)}`
    }
}

/**
 * Parse JSON config format
 */
function parseJsonConfig(json: any): RequestConfig {
    return {
        method: (json.method?.toUpperCase() || 'GET') as HttpMethod,
        url: normalizeUrl(json.url || ''),
        headers: Array.isArray(json.headers)
            ? json.headers
            : Object.entries(json.headers || {}).map(([key, value]) => ({
                key,
                value: String(value),
                enabled: true
            })),
        params: [],
        auth: json.auth || { type: 'none' },
        body: json.body
            ? { type: 'json', raw: typeof json.body === 'string' ? json.body : JSON.stringify(json.body, null, 2) }
            : { type: 'none' }
    }
}

/**
 * Parse inline options like headers and body after URL
 */
function parseInlineOptions(text: string): { headers: KeyValue[], body?: string } {
    const headers: KeyValue[] = []
    let body: string | undefined

    // Look for -H or --header patterns
    const headerRegex = /(?:-H|--header)\s+['"]?([^'"]+)['"]?/gi
    let headerMatch
    while ((headerMatch = headerRegex.exec(text)) !== null) {
        const parts = headerMatch[1].split(':')
        const key = parts[0]?.trim()
        const value = parts.slice(1).join(':').trim()
        if (key && value) {
            headers.push({ key, value, enabled: true })
        }
    }

    // Look for -d or --data patterns
    const dataMatch = text.match(/(?:-d|--data)\s+['"]?(.+?)['"]?(?:\s+-|$)/i)
    if (dataMatch) {
        body = dataMatch[1]
    }

    // Look for JSON body inline
    const jsonMatch = text.match(/\{.*\}/)
    if (jsonMatch && !body) {
        try {
            JSON.parse(jsonMatch[0])
            body = jsonMatch[0]
        } catch { }
    }

    return { headers, body }
}

/**
 * Extract query params from URL
 */
function extractQueryParams(url: string): KeyValue[] {
    try {
        const parsed = new URL(url)
        const params: KeyValue[] = []
        parsed.searchParams.forEach((value, key) => {
            params.push({ key, value, enabled: true })
        })
        return params
    } catch {
        return []
    }
}

/**
 * Normalize URL - add protocol if missing
 */
function normalizeUrl(url: string): string {
    if (!url) return ''
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url
    }
    return url
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url: string): string {
    try {
        const parsed = new URL(normalizeUrl(url))
        return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
    } catch {
        return url
    }
}

export { extractDomain, normalizeUrl }
