export interface CheckResult {
    valid: boolean;
    provider: string; // 'OpenAI' | 'Anthropic' | 'Google Gemini' | etc.
    message: string;
    premium?: boolean;
    models?: string[];
    confidenceScore: number; // 0.0 to 1.0
    trustLevel: 'High' | 'Medium' | 'Low';
    metadata?: Record<string, any>; // Extra debug info
}

export interface ProviderAdapter {
    id: string; // e.g., 'openai'
    name: string; // e.g., 'OpenAI'
    matches(key: string): boolean; // Regex check
    check(key: string): Promise<CheckResult>; // Actual API verifier
}
