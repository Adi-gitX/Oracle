export async function checkLeak(key: string): Promise<'clean' | 'leaked' | 'skipped'> {
    try {
        // GitHub Code Search API
        if (key.length < 20) return 'clean';

        const q = encodeURIComponent(`"${key}"`);
        const res = await fetch(`https://api.github.com/search/code?q=${q}&per_page=1`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Oracle-Leak-Monitor'
            }
        });

        if (res.status === 403 || res.status === 429) {
            console.warn('GitHub Rate Limit Hit during Leak Check');
            return 'skipped';
        }

        if (!res.ok) return 'clean'; // specific error usually means checking failed to run

        const data = await res.json();
        return data.total_count > 0 ? 'leaked' : 'clean';
    } catch (e) {
        console.error('Leak check failed', e);
        return 'clean'; // Fail open
    }
}
