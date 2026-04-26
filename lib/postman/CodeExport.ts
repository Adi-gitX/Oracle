import type { RequestConfig } from './types'

function resolveHeaders(config: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {}
    config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${config.auth.bearer.token}`
    } else if (config.auth.type === 'basic' && config.auth.basic) {
        const enc = typeof btoa === 'function'
            ? btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)
            : Buffer.from(`${config.auth.basic.username}:${config.auth.basic.password}`).toString('base64')
        headers['Authorization'] = `Basic ${enc}`
    } else if (config.auth.type === 'apikey' && config.auth.apikey?.addTo === 'header') {
        headers[config.auth.apikey.key] = config.auth.apikey.value
    }
    return headers
}

function resolveUrl(config: RequestConfig): string {
    const enabledParams = config.params.filter(p => p.enabled && p.key)
    if (enabledParams.length === 0) return config.url
    const sep = config.url.includes('?') ? '&' : '?'
    const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
    return `${config.url}${sep}${qs}`
}

function bodyForMethod(config: RequestConfig): string | null {
    if (['GET', 'HEAD'].includes(config.method)) return null
    if (config.body?.type !== 'none' && config.body?.raw) return config.body.raw
    return null
}

export function exportToFetch(config: RequestConfig): string {
    const url = resolveUrl(config)
    const headers = resolveHeaders(config)
    const body = bodyForMethod(config)
    const opts: string[] = [`  method: ${JSON.stringify(config.method)}`]
    if (Object.keys(headers).length > 0) {
        opts.push(`  headers: ${JSON.stringify(headers, null, 4).split('\n').join('\n  ')}`)
    }
    if (body) opts.push(`  body: ${JSON.stringify(body)}`)
    return `const response = await fetch(${JSON.stringify(url)}, {
${opts.join(',\n')}
})
const data = await response.json()
console.log(data)`
}

export function exportToPython(config: RequestConfig): string {
    const url = resolveUrl(config)
    const headers = resolveHeaders(config)
    const body = bodyForMethod(config)
    const lines: string[] = ['import requests', '']
    if (Object.keys(headers).length > 0) {
        lines.push(`headers = ${JSON.stringify(headers, null, 4).replace(/"/g, "'")}`)
        lines.push('')
    }
    const fnArgs: string[] = [JSON.stringify(url)]
    if (Object.keys(headers).length > 0) fnArgs.push('headers=headers')
    if (body) {
        try {
            JSON.parse(body)
            lines.push(`payload = ${body}`)
            lines.push('')
            fnArgs.push('json=payload')
        } catch {
            fnArgs.push(`data=${JSON.stringify(body)}`)
        }
    }
    lines.push(`response = requests.${config.method.toLowerCase()}(${fnArgs.join(', ')})`)
    lines.push('print(response.status_code)')
    lines.push('print(response.json())')
    return lines.join('\n')
}

export function exportToGo(config: RequestConfig): string {
    const url = resolveUrl(config)
    const headers = resolveHeaders(config)
    const body = bodyForMethod(config)
    const lines: string[] = [
        'package main',
        '',
        'import (',
        '\t"fmt"',
        '\t"io"',
        '\t"net/http"'
    ]
    if (body) lines.push('\t"strings"')
    lines.push(')')
    lines.push('')
    lines.push('func main() {')
    if (body) {
        lines.push(`\tbody := strings.NewReader(\`${body.replace(/`/g, '\\`')}\`)`)
        lines.push(`\treq, _ := http.NewRequest(${JSON.stringify(config.method)}, ${JSON.stringify(url)}, body)`)
    } else {
        lines.push(`\treq, _ := http.NewRequest(${JSON.stringify(config.method)}, ${JSON.stringify(url)}, nil)`)
    }
    Object.entries(headers).forEach(([k, v]) => {
        lines.push(`\treq.Header.Set(${JSON.stringify(k)}, ${JSON.stringify(v)})`)
    })
    lines.push('\tres, err := http.DefaultClient.Do(req)')
    lines.push('\tif err != nil { panic(err) }')
    lines.push('\tdefer res.Body.Close()')
    lines.push('\tdata, _ := io.ReadAll(res.Body)')
    lines.push('\tfmt.Println(res.StatusCode, string(data))')
    lines.push('}')
    return lines.join('\n')
}

export function exportToHttpie(config: RequestConfig): string {
    const url = resolveUrl(config)
    const headers = resolveHeaders(config)
    const body = bodyForMethod(config)
    const parts: string[] = ['http', config.method]
    parts.push(JSON.stringify(url))
    Object.entries(headers).forEach(([k, v]) => {
        parts.push(`${JSON.stringify(`${k}:${v}`)}`)
    })
    if (body) {
        try {
            const j = JSON.parse(body)
            Object.entries(j).forEach(([k, v]) => parts.push(`${k}:=${JSON.stringify(v)}`))
        } catch {
            parts.push(`<<<${JSON.stringify(body)}`)
        }
    }
    return parts.join(' \\\n  ')
}
