export async function checkLeak(key: string): Promise<'clean' | 'leaked' | 'skipped'> {
    // Privacy-safe default: do not send raw secrets to third-party services.
    // We keep the return contract for compatibility and mark checks as skipped.
    void key;
    return 'skipped';
}
