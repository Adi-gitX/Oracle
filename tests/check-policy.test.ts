import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHintIds, pickAdapter } from '../pages/api/check'
import type { ProviderAdapter } from '../lib/adapters/types'

const mkAdapter = (id: string, name: string): ProviderAdapter => ({
    id,
    name,
    matches: () => true,
    check: async () => ({
        valid: false,
        provider: name,
        message: '',
        confidenceScore: 0,
        trustLevel: 'Low',
        verificationLevel: 'unknown'
    })
})

test('parseHintIds resolves string and object hints', () => {
    const idsFromString = parseHintIds('OPENAI_API_KEY and GROQ_KEY')
    assert.equal(idsFromString.has('openai'), true)
    assert.equal(idsFromString.has('groq'), true)

    const idsFromObject = parseHintIds({ provider: 'google', variableName: 'GEMINI_API_KEY' })
    assert.equal(idsFromObject.has('google'), true)
})

test('pickAdapter returns null for ambiguous adapter without hint', () => {
    const cohere = mkAdapter('cohere', 'Cohere')
    const selected = pickAdapter([cohere], new Set())
    assert.equal(selected, null)
})

test('pickAdapter accepts ambiguous adapter with matching hint', () => {
    const cohere = mkAdapter('cohere', 'Cohere')
    const selected = pickAdapter([cohere], new Set(['cohere']))
    assert.equal(selected?.id, 'cohere')
})

test('pickAdapter prefers single non-ambiguous match', () => {
    const generic = mkAdapter('generic_secret', 'Generic')
    const stripe = mkAdapter('stripe', 'Stripe')
    const selected = pickAdapter([generic, stripe], new Set())
    assert.equal(selected?.id, 'stripe')
})
