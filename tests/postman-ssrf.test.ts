import test from 'node:test'
import assert from 'node:assert/strict'
import {
    isPrivateIPv4,
    isPrivateIPv6,
    isBlockedHostName,
    allowlistMatch,
    sanitizeHeaders
} from '../pages/api/postman'

test('private IPv4 ranges are blocked', () => {
    assert.equal(isPrivateIPv4('127.0.0.1'), true)
    assert.equal(isPrivateIPv4('10.20.30.40'), true)
    assert.equal(isPrivateIPv4('172.20.1.1'), true)
    assert.equal(isPrivateIPv4('192.168.1.2'), true)
    assert.equal(isPrivateIPv4('8.8.8.8'), false)
})

test('private IPv6 ranges are blocked', () => {
    assert.equal(isPrivateIPv6('::1'), true)
    assert.equal(isPrivateIPv6('fc00::1'), true)
    assert.equal(isPrivateIPv6('fd12::1'), true)
    assert.equal(isPrivateIPv6('fe80::1'), true)
    assert.equal(isPrivateIPv6('2001:4860:4860::8888'), false)
})

test('hostname block patterns include localhost and internal domains', () => {
    assert.equal(isBlockedHostName('localhost'), true)
    assert.equal(isBlockedHostName('api.internal'), true)
    assert.equal(isBlockedHostName('service.local'), true)
    assert.equal(isBlockedHostName('api.github.com'), false)
})

test('allowlist supports exact and suffix entries', () => {
    const allowlist = ['api.github.com', '.example.dev']
    assert.equal(allowlistMatch('api.github.com', allowlist), true)
    assert.equal(allowlistMatch('svc.example.dev', allowlist), true)
    assert.equal(allowlistMatch('example.dev', allowlist), true)
    assert.equal(allowlistMatch('api.example.com', allowlist), false)
})

test('sanitizeHeaders strips hop-by-hop headers and sets user-agent', () => {
    const cleaned = sanitizeHeaders({
        Host: 'internal',
        Connection: 'keep-alive',
        Authorization: 'Bearer abc',
        Accept: 'application/json'
    })

    assert.equal('Host' in cleaned, false)
    assert.equal('Connection' in cleaned, false)
    assert.equal(cleaned.Authorization, 'Bearer abc')
    assert.equal(cleaned.Accept, 'application/json')
    assert.ok(Object.keys(cleaned).some((key) => key.toLowerCase() === 'user-agent'))
})
