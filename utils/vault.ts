import { encryptData, decryptData } from './encryption';

/**
 * Trust Layer: Client-Side Session Vault
 * Stores API keys in memory only, encrypted at rest within the JS heap.
 * Prevents casual XSS scrapers from reading global vars, though deep memory inspection is still possible.
 * Implements strict wipe() logic.
 */
class SessionVault {
    private static instance: SessionVault;
    private encryptedParams: Map<string, string> = new Map();

    private constructor() { }

    public static getInstance(): SessionVault {
        if (!SessionVault.instance) {
            SessionVault.instance = new SessionVault();
        }
        return SessionVault.instance;
    }

    /**
     * Stores a key securely. We strictly encrypt it before putting it in our Map.
     */
    public setKey(provider: string, rawKey: string): void {
        this.encryptedParams.set(provider, encryptData(rawKey));
    }

    /**
     * Retrieves a key. Only decrypts at the exact moment of use.
     */
    public getKey(provider: string): string | null {
        const encrypted = this.encryptedParams.get(provider);
        if (!encrypted) return null;
        try {
            return decryptData(encrypted);
        } catch (e) {
            console.error('Vault integrity check failed');
            return null;
        }
    }

    /**
     * The Nuclear Option. Wipes all keys from memory.
     */
    public wipe(): void {
        this.encryptedParams.clear();
        // Force garbage collection hint (best effort)
        this.encryptedParams = new Map();
    }
}

export const vault = SessionVault.getInstance();
