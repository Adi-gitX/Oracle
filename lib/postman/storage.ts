// Local Storage Management for Postman

import type {
    PostmanStorage,
    RequestHistoryItem,
    Collection,
    Environment,
    PostmanSettings,
    defaultSettings
} from './types';

const STORAGE_KEY = 'oracle_postman_data';
const MAX_HISTORY_ITEMS = 100;

// Get full storage
export function getPostmanStorage(): PostmanStorage {
    if (typeof window === 'undefined') {
        return getDefaultStorage();
    }

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
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
        settings: {
            followRedirects: true,
            timeout: 30000,
            sslVerification: true
        }
    };
}

// History management
export function addToHistory(item: RequestHistoryItem): void {
    const storage = getPostmanStorage();

    // Add to beginning
    storage.history.unshift(item);

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
    storage.settings = { ...storage.settings, ...settings };
    savePostmanStorage(storage);
}

// Generate unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
