// Local Storage Management for Postman

import type {
    PostmanStorage,
    RequestHistoryItem,
    Collection,
    Environment,
    PostmanSettings
} from './types';
import { defaultSettings } from './types';

const STORAGE_KEY = 'oracle_postman_data';
const MAX_HISTORY_ITEMS = 100;
const REDACTED_VALUE = '[REDACTED]';
const MAX_TIMEOUT_MS = 120000;
const MIN_TIMEOUT_MS = 1000;

const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|api[-_]?key|cookie/i;

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function toString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeTimeout(timeout: unknown): number {
    const value = Math.round(toNumber(timeout, defaultSettings.timeout));
    return Math.max(MIN_TIMEOUT_MS, Math.min(value, MAX_TIMEOUT_MS));
}

function isSensitiveKey(key: string): boolean {
    return SENSITIVE_KEY_PATTERN.test(key);
}

function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        parsed.username = '';
        parsed.password = '';
        parsed.searchParams.forEach((value, key) => {
            if (isSensitiveKey(key) && value) {
                parsed.searchParams.set(key, REDACTED_VALUE);
            }
        });
        return parsed.toString();
    } catch {
        return url;
    }
}

function sanitizeKeyValueArray(items: unknown): Array<{ key: string; value: string; enabled: boolean; description?: string }> {
    if (!Array.isArray(items)) return [];

    return items
        .filter(isObject)
        .map((item) => {
            const key = toString(item.key);
            const rawValue = toString(item.value);
            return {
                key,
                value: isSensitiveKey(key) ? REDACTED_VALUE : rawValue,
                enabled: toBoolean(item.enabled, true),
                description: typeof item.description === 'string' ? item.description : undefined
            };
        });
}

function sanitizeAuth(auth: unknown): RequestHistoryItem['request']['auth'] {
    if (!isObject(auth)) {
        return { type: 'none' };
    }

    const type = toString(auth.type, 'none');
    if (type === 'bearer') {
        return { type: 'bearer', bearer: { token: REDACTED_VALUE } };
    }
    if (type === 'basic') {
        return {
            type: 'basic',
            basic: {
                username: toString(auth.basic && isObject(auth.basic) ? auth.basic.username : ''),
                password: REDACTED_VALUE
            }
        };
    }
    if (type === 'apikey') {
        const apikey = isObject(auth.apikey) ? auth.apikey : {};
        return {
            type: 'apikey',
            apikey: {
                key: toString(apikey.key, 'X-API-Key'),
                value: REDACTED_VALUE,
                addTo: toString(apikey.addTo, 'header') === 'query' ? 'query' : 'header'
            }
        };
    }

    return { type: 'none' };
}

function sanitizeBody(body: unknown): RequestHistoryItem['request']['body'] {
    if (!isObject(body)) {
        return { type: 'none' };
    }

    const type = toString(body.type, 'none');
    const supportedTypes = new Set(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary']);
    const safeType = supportedTypes.has(type) ? type as RequestHistoryItem['request']['body']['type'] : 'none';

    return {
        type: safeType,
        raw: typeof body.raw === 'string' && body.raw.length > 0 ? REDACTED_VALUE : undefined,
        formData: sanitizeKeyValueArray(body.formData),
        urlencoded: sanitizeKeyValueArray(body.urlencoded)
    };
}

function sanitizeRequest(request: unknown): RequestHistoryItem['request'] {
    if (!isObject(request)) {
        return {
            method: 'GET',
            url: '',
            headers: [],
            params: [],
            auth: { type: 'none' },
            body: { type: 'none' }
        };
    }

    const method = toString(request.method, 'GET').toUpperCase();
    const supportedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

    return {
        id: toString(request.id) || undefined,
        name: toString(request.name) || undefined,
        method: supportedMethods.has(method) ? method as RequestHistoryItem['request']['method'] : 'GET',
        url: sanitizeUrl(toString(request.url)),
        headers: sanitizeKeyValueArray(request.headers),
        params: sanitizeKeyValueArray(request.params),
        auth: sanitizeAuth(request.auth),
        body: sanitizeBody(request.body)
    };
}

function sanitizeResponse(response: unknown): RequestHistoryItem['response'] {
    if (!isObject(response)) {
        return {
            status: 0,
            statusText: '',
            headers: {},
            body: '',
            time: 0,
            size: 0
        };
    }

    const safeHeaders: Record<string, string> = {};
    if (isObject(response.headers)) {
        for (const [key, value] of Object.entries(response.headers)) {
            const stringValue = toString(value);
            safeHeaders[key] = isSensitiveKey(key) ? REDACTED_VALUE : stringValue;
        }
    }

    return {
        status: Math.max(0, Math.floor(toNumber(response.status, 0))),
        statusText: toString(response.statusText),
        headers: safeHeaders,
        body: toString(response.body),
        time: Math.max(0, Math.floor(toNumber(response.time, 0))),
        size: Math.max(0, Math.floor(toNumber(response.size, 0))),
        cookies: Array.isArray(response.cookies)
            ? response.cookies
                .filter(isObject)
                .map(cookie => ({
                    name: toString(cookie.name),
                    value: REDACTED_VALUE,
                    domain: toString(cookie.domain) || undefined,
                    path: toString(cookie.path) || undefined
                }))
                .filter(cookie => cookie.name.length > 0)
            : undefined
    };
}

export function sanitizeHistoryItem(item: unknown): RequestHistoryItem | null {
    if (!isObject(item)) return null;

    return {
        id: toString(item.id),
        timestamp: Math.max(0, Math.floor(toNumber(item.timestamp, Date.now()))),
        request: sanitizeRequest(item.request),
        response: sanitizeResponse(item.response)
    };
}

function sanitizeCollections(collections: unknown): Collection[] {
    if (!Array.isArray(collections)) return [];

    return collections
        .filter(isObject)
        .map((collection) => ({
            id: toString(collection.id),
            name: toString(collection.name),
            description: toString(collection.description) || undefined,
            requests: Array.isArray(collection.requests)
                ? collection.requests
                    .filter(isObject)
                    .map((request) => ({
                        id: toString(request.id),
                        name: toString(request.name),
                        request: sanitizeRequest(request.request)
                    }))
                    .filter(request => request.id.length > 0 && request.name.length > 0)
                : [],
            folders: Array.isArray(collection.folders)
                ? collection.folders
                    .filter(isObject)
                    .map((folder) => ({
                        id: toString(folder.id),
                        name: toString(folder.name),
                        requests: Array.isArray(folder.requests)
                            ? folder.requests
                                .filter(isObject)
                                .map((request) => ({
                                    id: toString(request.id),
                                    name: toString(request.name),
                                    request: sanitizeRequest(request.request)
                                }))
                                .filter(request => request.id.length > 0 && request.name.length > 0)
                            : []
                    }))
                    .filter(folder => folder.id.length > 0 && folder.name.length > 0)
                : [],
            createdAt: Math.max(0, Math.floor(toNumber(collection.createdAt, Date.now()))),
            updatedAt: Math.max(0, Math.floor(toNumber(collection.updatedAt, Date.now())))
        }))
        .filter(collection => collection.id.length > 0 && collection.name.length > 0);
}

function sanitizeEnvironments(environments: unknown): Environment[] {
    if (!Array.isArray(environments)) return [];

    return environments
        .filter(isObject)
        .map((env) => ({
            id: toString(env.id),
            name: toString(env.name),
            isActive: toBoolean(env.isActive, false),
            variables: Array.isArray(env.variables)
                ? env.variables
                    .filter(isObject)
                    .map((variable) => ({
                        key: toString(variable.key),
                        value: isSensitiveKey(toString(variable.key))
                            ? REDACTED_VALUE
                            : toString(variable.value),
                        enabled: toBoolean(variable.enabled, true),
                        secret: toBoolean(variable.secret, false)
                    }))
                    .filter(variable => variable.key.length > 0)
                : []
        }))
        .filter(env => env.id.length > 0 && env.name.length > 0);
}

function sanitizeSettings(settings: unknown): PostmanSettings {
    const raw = isObject(settings) ? settings : {};
    return {
        historyEnabled: toBoolean(raw.historyEnabled, defaultSettings.historyEnabled),
        followRedirects: toBoolean(raw.followRedirects, defaultSettings.followRedirects),
        timeout: sanitizeTimeout(raw.timeout),
        sslVerification: toBoolean(raw.sslVerification, defaultSettings.sslVerification)
    };
}

export function sanitizeStorage(rawStorage: unknown): PostmanStorage {
    if (!isObject(rawStorage)) {
        return getDefaultStorage();
    }

    const history = Array.isArray(rawStorage.history)
        ? rawStorage.history
            .map(sanitizeHistoryItem)
            .filter((item): item is RequestHistoryItem => item !== null)
            .slice(0, MAX_HISTORY_ITEMS)
        : [];

    const environments = sanitizeEnvironments(rawStorage.environments);
    const activeEnvironmentRaw = toString(rawStorage.activeEnvironment);
    const activeEnvironment = environments.some(env => env.id === activeEnvironmentRaw) ? activeEnvironmentRaw : null;

    return {
        history,
        collections: sanitizeCollections(rawStorage.collections),
        environments,
        activeEnvironment,
        settings: sanitizeSettings(rawStorage.settings)
    };
}

// Get full storage
export function getPostmanStorage(): PostmanStorage {
    if (typeof window === 'undefined') {
        return getDefaultStorage();
    }

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return sanitizeStorage(JSON.parse(data));
        }
    } catch (e) {
        console.error('Failed to load Postman storage:', e);
    }

    return getDefaultStorage();
}

// Save full storage
export function savePostmanStorage(storage: PostmanStorage): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save Postman storage:', e);
    }
}

// Default storage state
function getDefaultStorage(): PostmanStorage {
    return {
        history: [],
        collections: [],
        environments: [],
        activeEnvironment: null,
        settings: { ...defaultSettings }
    };
}

// History management
export function addToHistory(item: RequestHistoryItem): void {
    const storage = getPostmanStorage();
    if (!storage.settings.historyEnabled) return;

    const safeItem = sanitizeHistoryItem(item);
    if (!safeItem) return;

    storage.history.unshift(safeItem);

    // Trim to max items
    if (storage.history.length > MAX_HISTORY_ITEMS) {
        storage.history = storage.history.slice(0, MAX_HISTORY_ITEMS);
    }

    savePostmanStorage(storage);
}

export function getHistory(): RequestHistoryItem[] {
    return getPostmanStorage().history;
}

export function clearHistory(): void {
    const storage = getPostmanStorage();
    storage.history = [];
    savePostmanStorage(storage);
}

// Collection management
export function getCollections(): Collection[] {
    return getPostmanStorage().collections;
}

export function saveCollection(collection: Collection): void {
    const storage = getPostmanStorage();
    const index = storage.collections.findIndex(c => c.id === collection.id);

    if (index >= 0) {
        storage.collections[index] = collection;
    } else {
        storage.collections.push(collection);
    }

    savePostmanStorage(storage);
}

export function deleteCollection(id: string): void {
    const storage = getPostmanStorage();
    storage.collections = storage.collections.filter(c => c.id !== id);
    savePostmanStorage(storage);
}

// Environment management
export function getEnvironments(): Environment[] {
    return getPostmanStorage().environments;
}

export function saveEnvironment(environment: Environment): void {
    const storage = getPostmanStorage();
    const index = storage.environments.findIndex(e => e.id === environment.id);

    if (index >= 0) {
        storage.environments[index] = environment;
    } else {
        storage.environments.push(environment);
    }

    savePostmanStorage(storage);
}

export function setActiveEnvironment(id: string | null): void {
    const storage = getPostmanStorage();
    storage.activeEnvironment = id;

    // Update isActive flags
    storage.environments.forEach(env => {
        env.isActive = env.id === id;
    });

    savePostmanStorage(storage);
}

export function getActiveEnvironment(): Environment | null {
    const storage = getPostmanStorage();
    return storage.environments.find(e => e.id === storage.activeEnvironment) || null;
}

// Variable substitution
export function substituteVariables(text: string): string {
    const env = getActiveEnvironment();
    if (!env) return text;

    let result = text;
    env.variables.forEach(variable => {
        if (variable.enabled) {
            const pattern = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
            result = result.replace(pattern, variable.value);
        }
    });

    return result;
}

// Settings
export function getSettings(): PostmanSettings {
    return getPostmanStorage().settings;
}

export function updateSettings(settings: Partial<PostmanSettings>): void {
    const storage = getPostmanStorage();
    storage.settings = sanitizeSettings({ ...storage.settings, ...settings });
    savePostmanStorage(storage);
}

// Generate unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
